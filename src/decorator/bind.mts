import { initPrototypeSlot } from './propertySlot.mjs'
export function Bind(proto:any,name:string){
    const slot = initPrototypeSlot(proto)
    slot.bindKeys ??= new Set
    slot.bindKeys.add(name)
}