import { initPrototypeSlot } from './propertySlot'
export function Bind(proto:any,name:string){
    const slot = initPrototypeSlot(proto)
    slot.bindKeys ??= new Set
    slot.bindKeys.add(name)
}