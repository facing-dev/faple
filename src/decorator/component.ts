import type { ComponentConstructor } from '../component/component'
import { initPrototypeSlot } from './propertySlot'
import { VNodeElement } from '../vdom/vnode'


export function Comp(opt: {
        render: () => VNodeElement
}) {
        return function (cons: ComponentConstructor) {
                const slot = initPrototypeSlot(cons.prototype)
                slot.renderer = opt.render
        }
}