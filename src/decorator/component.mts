import { initPrototypeSlot } from './propertySlot.mjs'
import { VNodeElement } from '../vdom/vnode.mjs'
export function Comp(opt: {
        render: () => VNodeElement
}) {
        return function (cons: any) {
                const slot = initPrototypeSlot(cons.prototype)
                slot.renderer = opt.render
        }
}