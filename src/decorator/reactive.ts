// import { initRuntimeHelper, Decorator,getDecorator } from './helper'
import type { Component } from '../component/component'
import { initPrototypeSlot } from './propertySlot'
export function Reactive(comp: Component, propertyKey: string) {
    const slot = initPrototypeSlot(comp)
    slot.reactiveKeys ??= new Set
    slot.reactiveKeys.add(propertyKey)
}

// export function ReactiveSync(target: any, propertyKey: string) {
//     initRuntimeHelper(target)
//     let r: Decorator = getDecorator(target)
//     r.syncObservables.push(propertyKey)

// }