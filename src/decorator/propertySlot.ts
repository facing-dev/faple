import type { Component } from '../component/component'
import type { VNodeInstanceRoot } from '../vdom/vnode'
export class PrototypeSlot {
    renderer?: () => VNodeInstanceRoot
    reactiveKeys?: Set<string>
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