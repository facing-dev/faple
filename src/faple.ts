import { v4 as uuidV4 } from 'uuid'
import type { VNodeEl, VNode } from './h/jsx-runtime'
function couldReuseEl(oldVNode: VNode, newVNode: VNode) {

    if (oldVNode.type !== newVNode.type) {
        return false
    }
    if (oldVNode.type === 'VNodeEl' && newVNode.type === 'VNodeEl') {
        if (oldVNode.tag !== newVNode.tag) {
            return false
        }
        if (oldVNode.key !== newVNode.key) {
            return false
        }
    }
    return true
}
function initDom(vnode: VNode) {
    if (vnode.type === 'VNodeText') {
        const node = document.createTextNode(vnode.text)
        vnode.node = node
        return node
    }
    const el = document.createElement(vnode.tag)
    for (const key in vnode.attrs) {
        const attr = vnode.attrs[key]
        el.setAttribute(key, attr)
    }
    for (const key in vnode.listeners) {
        const event = vnode.listeners[key]
        el.addEventListener(key, event as any)
    }
    for (const key in vnode.children) {
        const child = vnode.children[key]
        const childEl = initDom(child)
        el.appendChild(childEl)
    }
    vnode.node = el
    return el
}

function updateDom(oldVNode: VNode, newVNode: VNode) {
    if (!couldReuseEl(oldVNode, newVNode)) {
        throw '5'
    }
    if (oldVNode.type === 'VNodeEl' && newVNode.type === 'VNodeEl') {
        {
            //attr
            for (const key in newVNode.attrs) {
                if (key in oldVNode.attrs) {
                    if (newVNode.attrs[key] !== oldVNode.attrs[key]) {
                        oldVNode.node!.setAttribute(key, newVNode.attrs[key])
                    } else {
                        continue
                    }
                } else {
                    oldVNode.node!.setAttribute(key, newVNode.attrs[key])
                }
            }
            for (const key in oldVNode.attrs) {
                if (!(key in newVNode.attrs)) {
                    oldVNode.node!.removeAttribute(key)
                }
            }
        }

        {
            //listener
            for (const key in newVNode.listeners) {
                if (key in oldVNode.listeners) {
                    if (newVNode.listeners[key] !== oldVNode.listeners[key]) {
                        oldVNode.node!.removeEventListener(key, oldVNode.listeners[key] as any)
                        oldVNode.node!.addEventListener(key, newVNode.listeners[key] as any)
                    } else {
                        continue
                    }
                } else {
                    oldVNode.node!.addEventListener(key, newVNode.listeners[key] as any)
                }
            }
            for (const key in oldVNode.listeners) {
                if (!(key in newVNode.listeners)) {
                    oldVNode.node!.removeEventListener(key, oldVNode.listeners[key] as any)
                }
            }
        }

        {
            //children
            let newInd = -1
            for (const oldInd in oldVNode.children) {
                newInd = Number(oldInd)
                if (newInd >= newVNode.children.length) {
                    oldVNode.children[oldInd].node!.remove()
                    continue
                }
                if (couldReuseEl(oldVNode.children[oldInd], newVNode.children[newInd])) {
                    updateDom(oldVNode.children[oldInd], newVNode.children[newInd])
                } else {
                    const node = initDom(newVNode.children[newInd])
                    oldVNode.node!.replaceChild(node, oldVNode.children[oldInd].node!)
                }
            }
            for (newInd++; newInd < newVNode.children.length; newInd++) {
                const node = initDom(newVNode.children[newInd])
                oldVNode.node!.appendChild(node)
            }
        }
        newVNode.node = oldVNode.node
        return
    } else if (oldVNode.type === 'VNodeText' && newVNode.type === 'VNodeText') {
        if (oldVNode.text !== newVNode.text) {
            oldVNode.node!.textContent = newVNode.text
        }
        newVNode.node = oldVNode.node
        return
    }
    throw '6'
}
export default class MVVM {
    constructor(public root: HTMLElement) {
    }
    private components: Record<string, {
        component: Component,
        vNode: VNodeEl,

    }> = {}
    private initComponent(component: ComponentConstructor) {
        const comp = new component()
        comp._setMVVM(this)
        const vNode = comp.render()
        const el = initDom(vNode)
 
        if (!(el instanceof HTMLElement)) {
            throw '1'
        }
        this.components[comp._id] = {
            component: comp,
            vNode
        }
        comp.mounted()
        return this.components[comp._id]
    }
    update(component: Component) {
        const record = this.components[component._id]
        if (!record) {
            throw '2'
        }
        console.log('update', record)
        const newVNode = record.component.render()
        const oldVNode = record.vNode

        updateDom(oldVNode, newVNode)

        record.vNode = newVNode
    }
    mount(component: ComponentConstructor) {
        const record = this.initComponent(component)
        if (!record.vNode.node) {
            throw '3'
        }
        this.root.append(record.vNode.node)
    }
}

export abstract class Component {
    _id: string
    _mvvm: MVVM | null = null
    constructor() {
        this._id = uuidV4()
    }
    abstract render(): VNodeEl
    _setMVVM(mvvm: MVVM) {
        this._mvvm = mvvm

    }
    _update() {
        if (!this._mvvm) {
            throw '4'
        }
        this._mvvm.update(this)
    }
    mounted(){

    }
}

type ComponentConstructor = { new(): Component }
