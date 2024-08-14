import type { Component } from '../component/component.mjs'
import type { VNodeElement } from '../vdom/vnode.mjs'
import { Metadata } from 'facing-metadata'
export class PrototypeSlot {
    renderer?: () => VNodeElement
    reactiveKeys?: Set<string>
    watchKeys?: Set<string>
    bindKeys?: Set<string>
}
export const PrototypeMeta = new Metadata<{ slot: PrototypeSlot }>(Symbol('faple-component-prototype'))
export function initPrototypeSlot(proto: Component) {
    let prototypeSlot = PrototypeMeta.getOwn(proto)?.slot
    if (prototypeSlot) {
        return prototypeSlot
    }
    prototypeSlot = new PrototypeSlot
    PrototypeMeta.create(proto, { slot: prototypeSlot })
    return prototypeSlot
}

