import type { ComponentConstructor } from '../component/component'
import { PrototypeSlot } from './propertySlot'
import { VNodeInstanceRoot } from '../vdom/vnode'
export function Comp(opt: {
        render: () => VNodeInstanceRoot
}) {
        return function (cons: ComponentConstructor) {
                const prototypeSlot = new PrototypeSlot
                Object.defineProperty(cons.prototype, '__prototypeSlot_', {
                        value: prototypeSlot,
                        enumerable: false,
                        configurable: false,
                        writable: false
                })
                prototypeSlot.renderer = opt.render

        }


}