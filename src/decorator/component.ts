import type { ComponentConstructor } from '../component/component'
import { initPrototypeSlot } from './propertySlot'
import { VNodeInstanceRoot } from '../vdom/vnode'

export function Comp(opt: {
        render: () => VNodeInstanceRoot
}) {
        return function (cons: ComponentConstructor) {
                const slot = initPrototypeSlot(cons.prototype)
                slot.renderer = opt.render
        }
}