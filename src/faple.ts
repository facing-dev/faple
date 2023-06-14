import recursiveFree from 'recursive-free'
import { VNode, VNodeInstanceReference, VNodeInstanceRoot, VNodeElement } from './vdom/vnode'
import { Component } from './component/component'
import Logger from './logger'
import { Scheduler } from './scheduler'
import * as Hydrate from './vdom/hydrate'
import { VoidElementTags } from './vdom/def'
import { KEY_ATTRIBUTE_HYDRATE_IGNORE, KEY_ATTRIBUTE_HYDRATE_IGNORE_STATIC, KEY_FAPLE_ID } from './constant'




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
        if (oldVNode.vNodeInstanceRoot.instance !== newVNode.vNodeInstanceRoot.instance) {
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
            Logger.error('Hydrate mismatched', vnode, hydrate, node)
        }
        vnode.node = node
        return node
    }
    if (vnode.type === 'ELEMENT' || vnode.type === 'INSTANCE_ROOT') {
        const vnodeElement = vnode.type === 'ELEMENT' ? vnode : vnode.elVNode
        let el: HTMLElement | null = null
        if (hydrate === false || Hydrate.isTextNode(hydrate)) {
            if (hydrate !== false) {

                mis = true
            }
            el = document.createElement(vnodeElement.tag)


        } else {
            if (hydrate.tagName.toLowerCase() === vnodeElement.tag.toLowerCase() && !Object.getOwnPropertyDescriptor(hydrate, KEY_FAPLE_ID)) {
                el = hydrate
            } else {
                mis = true
                el = document.createElement(vnodeElement.tag)
            }
        }
        if (mis) {
            Logger.error('Hydrate mismatched', vnode, hydrate, el)
        }
        if (vnodeElement.attributes) {
            for (const key in vnodeElement.attributes) {
                const attr = vnodeElement.attributes[key]
                el.setAttribute(key, attr)
            }
        }
        if (vnodeElement.listeners) {

            for (const key in vnodeElement.listeners) {

                const event = vnodeElement.listeners[key]

                el.addEventListener(key, event as any)
            }
        }
        if (typeof vnodeElement.classes === 'string') {
            el.className = vnodeElement.classes
        }
        if (typeof vnodeElement.styles === 'string') {
            el.setAttribute('style', vnodeElement.styles)
        }
        if (vnodeElement.rawHtml !== undefined) {
            el.innerHTML = vnodeElement.rawHtml
        }
        else if (vnodeElement.children) {
            let hydrateNodes: ReturnType<typeof Hydrate.getValideChildren> | null = null

            // let mismatched = false

            for (let i = 0, hydi = 0; i < vnodeElement.children.length; i++, hydi++) {


                const child: VNode = vnodeElement.children[i]
                let hydrateOpt: Comment | typeof hydrate = false
                if (hydrate) {
                    if (mis) {
                        hydrateOpt = false
                    } else {
                        hydrateNodes ??= Hydrate.getValideChildren(el)

                        hydrateOpt = hydrateNodes[hydi] ?? false

                        if (child.type === 'INSTANCE_ROOT') {
                            throw ''
                        }

                        while (hydrateOpt && Hydrate.isElementNode(hydrateOpt) && hydrateOpt.getAttribute(KEY_ATTRIBUTE_HYDRATE_IGNORE)) {
                            hydrateOpt.remove()
                            hydi++
                            hydrateOpt = hydrateNodes[hydi] ?? false
                        }

                        if (child.type !== 'TEXT' && hydrateOpt) {
                            while (hydrateOpt && Hydrate.isTextNode(hydrateOpt)) {

                                hydrateOpt.remove()
                                hydi++
                                hydrateOpt = hydrateNodes[hydi] ?? false

                            }
                        }
                        if (Hydrate.isHydrateHolderNode(hydrateOpt)) {
                            hydrateOpt = false
                        }
                    }
                }

                const childEl: HTMLElement | Text = yield { vnode: child, hydrate: hydrateOpt }
                if (hydrate && mis === false && childEl === hydrateOpt) {
                    //hydrated
                }
                else {
                    if (hydrateOpt) {
                        if (childEl.parentNode === hydrateOpt.parentNode) {
                            const ind = hydrateNodes?.findIndex(ite => ite === childEl) ?? false
                            if (ind === false || ind === -1) {
                                throw 'hydrate e 1'
                            }
                            hydrateNodes![ind] = document.createComment('hydrate replace holder')


                        }
                        el.replaceChild(childEl, hydrateOpt)
                    }
                    else {
                        el.appendChild(childEl)
                    }
                }
            }
        }
        vnodeElement.node = el
        if (vnode.type === 'ELEMENT' && vnode.ref) {
            vnode.ref.value = el
        }
        if (vnode.type === 'INSTANCE_ROOT') {
            Object.defineProperty(vnodeElement.node, KEY_FAPLE_ID, {
                value: vnode.instance.$$__slot.id,
                enumerable: false
            })
        }

        return el
    }
    if (vnode.type === 'INSTANCE_REFERENCE') {
        if (!vnode.vNodeInstanceRoot.elVNode.node) {
            Logger.error('Referenced instance not inited')
            throw ''
        }
        if (vnode.vNodeInstanceRoot.previousVNodeInstanceReference) {
            vnode.vNodeInstanceRoot.previousVNodeInstanceReference.isFake = true
        }

        return vnode.vNodeInstanceRoot.elVNode.node
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
        vNode.vNodeInstanceRoot.elVNode.node!.remove()
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
        let node: HTMLElement | undefined = undefined;
        let newVNodeElement: VNodeElement | null = null
        let oldVNodeElement: VNodeElement | null = null
        if (oldVNode.type === 'ELEMENT' && newVNode.type === 'ELEMENT') {
            node = newVNode.node = oldVNode.node!
            newVNodeElement = newVNode
            oldVNodeElement = oldVNode
        }
        if (oldVNode.type === 'INSTANCE_ROOT' && newVNode.type === 'INSTANCE_ROOT') {
            node = newVNode.elVNode.node = oldVNode.elVNode.node!
            newVNodeElement = newVNode.elVNode
            oldVNodeElement = oldVNode.elVNode
        }
        if (!node || !newVNodeElement || !oldVNodeElement) {
            throw ''
        }
        // const node = newVNode.node = oldVNode.node!
        {
            //rawHtml
            if (newVNodeElement.rawHtml !== oldVNodeElement.rawHtml) {

                node.innerHTML = newVNodeElement.rawHtml ?? ''

            }
        }
        {

            //attr
            if (newVNodeElement.attributes) {
                for (const key in newVNodeElement.attributes) {
                    if (oldVNodeElement.attributes && (key in oldVNodeElement.attributes)) {
                        if (newVNodeElement.attributes[key] !== oldVNodeElement.attributes[key]) {
                            node.setAttribute(key, newVNodeElement.attributes[key])
                        } else {
                            continue
                        }
                    } else {
                        node.setAttribute(key, newVNodeElement.attributes[key])
                    }
                }
            }
            if (oldVNodeElement.attributes) {
                for (const key in oldVNodeElement.attributes) {
                    if (!newVNodeElement.attributes || !(key in newVNodeElement.attributes)) {
                        node.removeAttribute(key)
                    }
                }
            }

        }

        {
            //listener
            if (newVNodeElement.listeners) {
                for (const key in newVNodeElement.listeners) {
                    if (oldVNodeElement.listeners && (key in oldVNodeElement.listeners)) {
                        if (newVNodeElement.listeners[key] !== oldVNodeElement.listeners[key]) {
                            node.removeEventListener(key, oldVNodeElement.listeners[key] as any)
                            node.addEventListener(key, newVNodeElement.listeners[key] as any)

                        } else {

                            continue

                        }
                    } else {
                        oldVNodeElement.node!.addEventListener(key, newVNodeElement.listeners[key] as any)
                    }
                }
            }
            if (oldVNodeElement.listeners) {
                for (const key in oldVNodeElement.listeners) {
                    if (!newVNodeElement.listeners || !(key in newVNodeElement.listeners)) {
                        node!.removeEventListener(key, oldVNodeElement.listeners[key] as any)

                    }
                }
            }
        }
        //classes
        {
            if (newVNodeElement.classes !== oldVNodeElement.classes) {
                node.className = newVNodeElement.classes ?? ''
            }
        }
        //styles
        {
            if (newVNodeElement.styles !== oldVNodeElement.styles) {
                node.setAttribute('style', newVNodeElement.styles ?? '')
            }
        }

        {
            //children
            let newInd = -1
            if (oldVNodeElement.children) {
                for (const oldInd in oldVNodeElement.children) {
                    const oldChild = oldVNodeElement.children[oldInd]
                    if (oldChild.type === 'INSTANCE_REFERENCE' && oldChild.isFake === true) {
                        continue
                    }
                    newInd += 1
                    if (!newVNodeElement.children || newInd >= newVNodeElement.children.length) {
                        removeDom(oldChild)
                        continue
                    }
                    const newChild = newVNodeElement.children[newInd]
                    if (couldReuse(oldChild, newChild)) {
                        yield [oldChild, newChild]

                    } else {
                        const newNode = initDom({ vnode: newChild, hydrate: false })
                        node.replaceChild(newNode, oldChild.type === 'INSTANCE_REFERENCE' ? oldChild.vNodeInstanceRoot.elVNode.node! : (oldChild.type === 'INSTANCE_ROOT' ? oldChild.elVNode.node! : oldChild.node!))
                    }
                }
            }
            if (newVNodeElement.children) {
                for (newInd++; newInd < newVNodeElement.children.length; newInd++) {
                    const newNode = initDom({ vnode: newVNodeElement.children[newInd], hydrate: false })
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
    components: Map<string, Component> = new Map
    scopeEl: HTMLElement
    constructor(scopeEl?: HTMLElement) {

        this.scopeEl = scopeEl ?? document.body
        const els = this.scopeEl.querySelectorAll(`[${KEY_ATTRIBUTE_HYDRATE_IGNORE}][${KEY_ATTRIBUTE_HYDRATE_IGNORE_STATIC}]`)
        els.forEach(e => e.innerHTML = '')
        console.log('els', els)
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
        this.components.set(comp.$$__slot.id, comp)
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
        if (!slot.vNodeElOld) {
            throw 'vNodeOld is undefined'
        }
        updateDom([slot.vNodeElOld, slot.vNodeEl!])
    }
    /**
     * not recursive
     */
    releaseComponent(comp: Component) {
        this.components.delete(comp.$$__slot.id)
        comp.beforeDestroy()
        comp.__slot.destroy()
    }
    getComponentByElement(el: HTMLElement): any {
        const id = Object.getOwnPropertyDescriptor(el, KEY_FAPLE_ID)?.value ?? undefined
        if (!id) {
            return undefined
        }
        return this.components.get(id)
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
    renderString(component: Component, opt?: {
        style?: boolean,
        vnodeModifier?: (vnode: VNodeInstanceRoot) => void
    }) {
        opt ??= {}
        opt.style ??= true
        const vNodeTree2String = recursiveFree<VNode, string>(function* (vnode: VNode) {
            if (vnode.type === 'TEXT') {
                return vnode.text
            }
            if (vnode.type === 'ELEMENT' || vnode.type === 'INSTANCE_ROOT') {
                const vnodeElement = vnode.type === 'ELEMENT' ? vnode : vnode.elVNode
                let str = `<${vnodeElement.tag}`
                if (vnodeElement.classes) {
                    str += ` class="${vnodeElement.classes}"`
                }
                if (vnodeElement.styles && opt?.style) {
                    str += ` style="${vnodeElement.styles}"`
                }
                if (vnodeElement.attributes) {
                    str += ' ' + Object.keys(vnodeElement.attributes).map(key => {
                        const val = vnodeElement.attributes![key]
                        if (typeof val === 'string') {
                            if (val !== '') {
                                return `${key}="${val}"`
                            } else {
                                return key
                            }
                        } else {
                            return ''
                        }
                    }).join(' ')
                }
                if (VoidElementTags.has(vnodeElement.tag)) {
                    str += '/>'
                } else {
                    str += '>'
                    if(vnodeElement.attributes && (KEY_ATTRIBUTE_HYDRATE_IGNORE in vnodeElement.attributes)){
                        console.log(vnode)
                    }
                    if (vnodeElement.attributes && (KEY_ATTRIBUTE_HYDRATE_IGNORE in vnodeElement.attributes) && !(KEY_ATTRIBUTE_HYDRATE_IGNORE_STATIC in vnodeElement.attributes)) {
                    }
                    else if (vnodeElement.children) {
                        for (const child of vnodeElement.children) {
                            if (child.type === 'INSTANCE_REFERENCE') {
                                str += yield child.vNodeInstanceRoot
                            }
                            else {
                                str += yield child
                            }
                        }
                    }
                    str += `</${vnodeElement.tag}>`
                }
                return str
            }
            throw ''
        })

        return new Promise<string>((res) => {
            this.waitComponentsMounted(() => {
                const vNode = comp.__slot.vNode!
                console.log('vvv', vNode)
                opt?.vnodeModifier?.(vNode)
                res(vNodeTree2String(vNode))
            })
            const comp = this.initComponent(component)
        })

    }
}

