import recursiveFree from 'recursive-free'
import { VNode, VNodeInstanceReference, VNodeInstanceRoot } from './vdom/vnode'
import { Component } from './component/component'
import Logger from './logger'
import { Scheduler } from './scheduler'
import * as Hydrate from './vdom/hydrate'
import { VoidElementTags } from './vdom/def'

// function isFakeVNodeInstanceReference(vnode: VNodeInstanceReference) {
//     if (!vnode.vNodeInstanceRoot.previousVNodeInstanceReference) {
//         Logger.error('previousVNodeInstanceReference is undefined')
//         throw ''
//     }
//     return vnode.vNodeInstanceRoot.previousVNodeInstanceReference !== vnode
// }

function couldReuse(oldVNode: VNode, newVNode: VNode) {

    if (oldVNode.type !== newVNode.type) {
        return false
    }
    if (oldVNode.type === 'ELEMENT' && newVNode.type === 'ELEMENT') {
        if (oldVNode.tag !== newVNode.tag) {
            return false
        }
        if (oldVNode.key !== newVNode.key) {
            return false
        }
    }
    if (oldVNode.type === 'INSTANCE_REFERENCE' && newVNode.type === 'INSTANCE_REFERENCE') {
        if (oldVNode.vNodeInstanceRoot !== newVNode.vNodeInstanceRoot) {
            return false
        }
    }
    if (oldVNode.type === 'INSTANCE_ROOT' && newVNode.type === 'INSTANCE_ROOT') {
        if (oldVNode.instance !== newVNode.instance) {
            Logger.error('INSTANCE_ROOT vnode must have same instance in couldReuse()')
            throw ''
        }
    }
    return true
}

const initDom = recursiveFree<{ vnode: VNode, hydrate: HTMLElement | Text | false }, HTMLElement | Text>(function* (opt) {
    const vnode = opt.vnode
    const hydrate = opt.hydrate
    let mis = false
    if (vnode.type === 'TEXT') {
        let node: Text | null = null

        if (hydrate === false) {
            node = document.createTextNode(vnode.text)
        }
        else {
            if (Hydrate.isTextNode(hydrate)) {
                node = hydrate
                node.nodeValue = vnode.text
            }
            else {
                mis = true
                node = document.createTextNode(vnode.text)
            }
        }
        if (mis) {
            Logger.warn('Hydrate mismatched', vnode, hydrate, node)
        }
        vnode.node = node
        return node
    }
    if (vnode.type === 'ELEMENT' || vnode.type === 'INSTANCE_ROOT') {
        let el: HTMLElement | null = null
        if (hydrate === false || Hydrate.isTextNode(hydrate)) {
            if (hydrate !== false) {
                mis = true
            }
            el = document.createElement(vnode.tag)

        } else {
            if (hydrate.tagName.toLowerCase() === vnode.tag.toLowerCase()) {
                el = hydrate
            } else {
                mis = true
                el = document.createElement(vnode.tag)
            }
        }
        if (mis) {
            Logger.warn('Hydrate mismatched', vnode, hydrate, el)
        }
        if (vnode.attributes) {
            for (const key in vnode.attributes) {
                const attr = vnode.attributes[key]
                el.setAttribute(key, attr)
            }
        }
        if (vnode.listeners) {

            for (const key in vnode.listeners) {
                const event = vnode.listeners[key]
                el.addEventListener(key, event as any)
            }
        }
        if (typeof vnode.classes === 'string') {
            el.className = vnode.classes
        }
        if (typeof vnode.styles === 'string') {
            el.setAttribute('style', vnode.styles)
        }
        if (vnode.children) {
            let hydrateNodes: ReturnType<typeof Hydrate.getValideChildren> | null = null
            // let mismatched = false
            for (const key in vnode.children) {
                let hydrateOpt: typeof hydrate = false
                if (hydrate) {
                    if (mis) {
                        hydrateOpt = false
                    } else {
                        hydrateNodes ??= Hydrate.getValideChildren(el)
                        hydrateOpt = hydrateNodes[key] ?? false
                    }
                }
                const child = vnode.children[key]
                const childEl = yield { vnode: child, hydrate: hydrateOpt }
                if (hydrate && mis === false && childEl === hydrateOpt) {
                    //hydrated
                }
                else {
                    if (hydrateOpt) {
                        el.replaceChild(childEl, hydrateOpt)
                    }
                    else {
                        el.appendChild(childEl)
                    }
                }
            }
        }
        vnode.node = el
        if (vnode.type === 'ELEMENT' && vnode.ref) {
            vnode.ref.value = el
        }
        return el
    }
    if (vnode.type === 'INSTANCE_REFERENCE') {
        if (!vnode.vNodeInstanceRoot.node) {
            Logger.error('Referenced instance not inited')
            throw ''
        }
        if(vnode.vNodeInstanceRoot.previousVNodeInstanceReference){
            vnode.vNodeInstanceRoot.previousVNodeInstanceReference.isFake=true
        }
        return vnode.vNodeInstanceRoot.node
    }
    Logger.error('VNode not supported', vnode)
    throw ''
})
function removeDom(vNode: VNode) {

    if (vNode.type === 'INSTANCE_ROOT') {
        Logger.error('Can not remove an instance root\'s dom')
        throw ''
    } else if (vNode.type === 'INSTANCE_REFERENCE') {
        // if (vNode.isFake===true) {
        //     return
        // }
        vNode.vNodeInstanceRoot.node!.remove()
    } else {
        vNode.node!.remove()
    }
}

const updateDom = recursiveFree<[VNode, VNode], void>(function* (args) {
    const [oldVNode, newVNode] = args
    if (!couldReuse(oldVNode, newVNode)) {
        return
    }

    if ((oldVNode.type === 'ELEMENT' && newVNode.type === 'ELEMENT') ||
        (oldVNode.type === 'INSTANCE_ROOT' && newVNode.type === 'INSTANCE_ROOT')) {
        const node = newVNode.node = oldVNode.node!
        {

            //attr
            if (newVNode.attributes) {
                for (const key in newVNode.attributes) {
                    if (oldVNode.attributes && (key in oldVNode.attributes)) {
                        if (newVNode.attributes[key] !== oldVNode.attributes[key]) {
                            node.setAttribute(key, newVNode.attributes[key])
                        } else {
                            continue
                        }
                    } else {
                        node.setAttribute(key, newVNode.attributes[key])
                    }
                }
            }
            if (oldVNode.attributes) {
                for (const key in oldVNode.attributes) {
                    if (!newVNode.attributes || !(key in newVNode.attributes)) {
                        node.removeAttribute(key)
                    }
                }
            }

        }

        {
            //listener
            if (newVNode.listeners) {
                for (const key in newVNode.listeners) {
                    if (oldVNode.listeners && (key in oldVNode.listeners)) {
                        if (newVNode.listeners[key] !== oldVNode.listeners[key]) {
                            node.removeEventListener(key, oldVNode.listeners[key] as any)
                            node.addEventListener(key, newVNode.listeners[key] as any)
                        } else {
                            continue
                        }
                    } else {
                        oldVNode.node!.addEventListener(key, newVNode.listeners[key] as any)
                    }
                }
            }
            if (oldVNode.listeners) {
                for (const key in oldVNode.listeners) {
                    if (!newVNode.listeners || !(key in newVNode.listeners)) {
                        node!.removeEventListener(key, oldVNode.listeners[key] as any)
                    }
                }
            }
        }
        //classes
        {
            if (newVNode.classes !== oldVNode.classes) {
                node.className = newVNode.classes ?? ''
            }
        }
        //styles
        {
            if (newVNode.styles !== oldVNode.styles) {
                node.setAttribute('style', newVNode.styles ?? '')
            }
        }

        {
            //children
            let newInd = -1
            if (oldVNode.children) {
                for (const oldInd in oldVNode.children) {
                    const oldChild = oldVNode.children[oldInd]
                    if (oldChild.type === 'INSTANCE_REFERENCE' && oldChild.isFake===true) {
                        continue
                    }
                    newInd += 1
                    if (!newVNode.children || newInd >= newVNode.children.length) {
                        removeDom(oldChild)
                        continue
                    }
                    const newChild = newVNode.children[newInd]
                    if (couldReuse(oldChild, newChild)) {
                        yield [oldChild, newChild]

                    } else {
                        const newNode = initDom({ vnode: newChild, hydrate: false })
                        node.replaceChild(newNode, oldChild.type === 'INSTANCE_REFERENCE' ? oldChild.vNodeInstanceRoot.node! : oldChild.node!)
                    }
                }
            }
            if (newVNode.children) {
                for (newInd++; newInd < newVNode.children.length; newInd++) {
                    const newNode = initDom({ vnode: newVNode.children[newInd], hydrate: false })
                    node.appendChild(newNode)
                }
            }

        }

        return
    } else if (oldVNode.type === 'TEXT' && newVNode.type === 'TEXT') {
        newVNode.node = oldVNode.node
        if (oldVNode.text !== newVNode.text) {
            oldVNode.node!.textContent = newVNode.text
        }

        return
    }
    else if (oldVNode.type === 'INSTANCE_REFERENCE' && newVNode.type === 'INSTANCE_REFERENCE') {
        return
    }
    throw '6'
})
export class Faple {
    constructor() {
        this.scheduler = new Scheduler(this)
    }
    scheduler: Scheduler
    private mountedPromises: Promise<void>[] = []
    waitComponentsMounted(cb: Function) {
        this.mountedPromises = []
        this.scheduler.scheduleWaitMounted(async () => {
            await Promise.all(this.mountedPromises)
            cb()
        })
    }
    initComponent<COMP extends Component>(comp: COMP, reuseEl?: HTMLElement) {

        comp.__slot.beforeMount()

        comp.__slot.hEffect.effect.run()

        const el = initDom({ vnode: comp.__slot.vNode!, hydrate: reuseEl ?? false })
        if (!(el instanceof HTMLElement)) {
            throw '1'
        }
        if (reuseEl && el !== reuseEl) {
            console.error(el)
            throw '2'
        }
        this.scheduler.scheduleMounted(() => {
            const ret = comp.mounted()
            if (ret) {
                this.mountedPromises ??= []
                this.mountedPromises?.push(ret)
            }
            comp.__slot.afterMounted()
        })
        return comp
    }
    updateComponent(comp: Component) {
        const slot = comp.__slot
        slot.hEffect.effect.run()
        if (!slot.vNodeOld) {
            throw 'vNodeOld is undefined'
        }
        updateDom([slot.vNodeOld, slot.vNode!])
    }
    /**
     * not recursive
     */
    releaseComponent(comp: Component) {
        comp.beforeDestroy()
        comp.__slot.destroy()
    }
    // mount(component: Component, useRootEl?: boolean) {
    //     const comp = this.initComponent(component, useRootEl ? this.root : undefined)
    //     const node = comp.__slot.vNode?.node
    //     if (!node) {
    //         throw '3'
    //     }
    //     if (!useRootEl) {
    //         this.root.append(node)
    //     }
    // }
    renderString(component: Component) {
        return new Promise<string>((res) => {
            this.waitComponentsMounted(() => {
                res(vNodeTree2String(comp.__slot.vNode!))
            })
            const comp = this.initComponent(component)
        })

    }
}

const vNodeTree2String = recursiveFree<VNode, string>(function* (vnode: VNode) {
    if (vnode.type === 'TEXT') {
        return vnode.text
    }
    if (vnode.type === 'ELEMENT' || vnode.type === 'INSTANCE_ROOT') {
        let str = `<${vnode.tag}`
        if (vnode.classes) {
            str += ` class="${vnode.classes}"`
        }
        if (vnode.styles) {
            str += ` style="${vnode.styles}"`
        }
        if (vnode.attributes) {
            str += ' ' + Object.keys(vnode.attributes).map(key => {
                const val = vnode.attributes![key]
                if (typeof val === 'string') {
                    `${key}="${val}"`
                } else {
                    return ''
                }
            }).join(' ')
        }
        if (VoidElementTags.has(vnode.tag)) {
            str += '/>'
        } else {
            str += '>'
            if (vnode.attributes && ('cdr-static-inner' in vnode.attributes)) {
                str += vnode.node?.innerHTML ?? ''
            }
            else if (vnode.children) {
                for (const child of vnode.children) {
                    if (child.type === 'INSTANCE_REFERENCE') {
                        str += yield child.vNodeInstanceRoot
                    }
                    else {
                        str += yield child
                    }
                }
            }
            str += `</${vnode.tag}>`
        }


        return str
    }
    throw ''
})
