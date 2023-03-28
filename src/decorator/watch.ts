
import { initPrototypeSlot } from './propertySlot'
export function Watch(proto: any, name: string) {
    const slot = initPrototypeSlot(proto)
    slot.watchKeys ??= new Set
    slot.watchKeys.add(name)
}
