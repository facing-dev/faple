import { initPrototypeSlot } from './propertySlot'
export function Bind(proto:any,name:string){
    console.log(name,proto)
    const slot = initPrototypeSlot(proto)
    slot.bindKeys ??= new Set
    slot.bindKeys.add(name)
}