import type { Component } from '../component/component'
import type { VNodeElement } from '../vdom/vnode'
export class PrototypeSlot {
    renderer?: () => VNodeElement
    reactiveKeys?: Set<string>
    watchKeys?: Set<string>
    bindKeys?: Set<string>
}

export function initPrototypeSlot(proto: Component) {

    const desc = Object.getOwnPropertyDescriptor(proto, '__prototypeSlot_')
    if (desc) {
        return desc.value as PrototypeSlot
    }
    const prototypeSlot = new PrototypeSlot

    Object.defineProperty(proto, '__prototypeSlot_', {
        value: prototypeSlot,
        enumerable: false,
        configurable: false,
        writable: false
    })
    return prototypeSlot
}