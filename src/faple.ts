import recursiveFree from 'recursive-free'

import { VNode, VNodeInstanceReference } from './vdom/vnode'
import { Component, ComponentConstructor } from './component/component'
import Logger from './logger'
import { Scheduler } from './scheduler'
function isFakeVNodeInstanceReference(vnode: VNodeInstanceReference) {
    if (!vnode.vNodeInstanceRoot.previousVNodeInstanceReference) {
        Logger.error('previousVNodeInstanceReference is undefined')
        throw ''
    }
    return vnode.vNodeInstanceRoot.previousVNodeInstanceReference !== vnode
}

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

const initDom = recursiveFree<VNode, HTMLElement | Text>(function* (vnode) {
    if (vnode.type === 'TEXT') {
        const node = document.createTextNode(vnode.text)
        vnode.node = node
        return node
    }
    if (vnode.type === 'ELEMENT' || vnode.type === 'INSTANCE_ROOT') {
        const el = document.createElement(vnode.tag)
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
            for (const key in vnode.children) {
                const child = vnode.children[key]
                const childEl = yield (child)
                el.appendChild(childEl)
            }
        }
        vnode.node = el
        return el
    }
    if (vnode.type === 'INSTANCE_REFERENCE') {
        if (!vnode.vNodeInstanceRoot.node) {
            Logger.error('Referenced instance not inited')
            throw ''
        }
        vnode.vNodeInstanceRoot.previousVNodeInstanceReference = vnode
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
        if (isFakeVNodeInstanceReference(vNode)) {
            return
        }
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
                    if (oldChild.type === 'INSTANCE_REFERENCE' && isFakeVNodeInstanceReference(oldChild)) {
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
                        const newNode = initDom(newChild)
                        node.replaceChild(newNode, oldChild.type === 'INSTANCE_REFERENCE' ? oldChild.vNodeInstanceRoot.node! : oldChild.node!)
                    }
                }
            }
            if (newVNode.children) {
                for (newInd++; newInd < newVNode.children.length; newInd++) {
                    const newNode = initDom(newVNode.children[newInd])
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

// function updateDom(oldVNode: VNode, newVNode: VNode) {

// }
export class Faple {
    constructor(public root: HTMLElement) {
        this.scheduler = new Scheduler(this)
    }
    scheduler: Scheduler
    initComponent<COMP extends Component>(component: { new(): COMP }): COMP {
        const comp = new component()
        comp.__slot.faple = this
        comp.__slot.h()
        const el = initDom(comp.__slot.vNode!)
        if (!(el instanceof HTMLElement)) {
            throw '1'
        }
        this.scheduler.scheduleMounted(comp)
        return comp
    }
    updateComponent(comp: Component) {
        console.log('rrr')
        const slot = comp.__slot
        slot.h()
        if (!slot.vNodeOld) {
            throw 'vNodeOld is undefined'
        }
        updateDom([slot.vNodeOld, slot.vNode!])
    }
    mount(component: ComponentConstructor) {
        const comp = this.initComponent(component)
        const node = comp.__slot.vNode?.node

        if (!node) {
            throw '3'
        }
        this.root.append(node)
    }
}


