import type { Component } from '../component/component.mjs'
import type { ComponentConstructor } from '../component/component.mjs'
type VNodeType = 'ELEMENT' | 'TEXT' | 'INSTANCE_ROOT' | 'INSTANCE_REFERENCE' | 'CONSTRUCTOR'
export interface Reference<T> {
    value: T | null
}
export function createReference<T>(init?: T): Reference<T> {
    return {
        value: typeof init === 'undefined' ? null : init
    }
}
const SymbolVNode = Symbol('faple-vnode')
interface VNodeBase {
    type: VNodeType

}

interface WithKey {
    key?: any
}

interface WithNode<N extends Node> {
    node?: N
}

interface VNodeEntity extends VNodeBase {
    tag: string
    attributes?: Record<string, string>
    listeners?: Record<string, Function>
    classes?: string
    // classesRaw?: any
    styles?: string
    // stylesRaw?: any
    children?: Array<VNode>
    rawHtml?: string
}

export function makeVNode<T extends VNode>(vNode: T): T {
    Object.defineProperty(vNode, SymbolVNode, {
        value: true,
        enumerable: false,
        configurable: false,
        writable: false
    })
    return vNode
}

export function isVNode<T extends VNode = VNode>(vNode: any): vNode is T {
    return typeof vNode === 'object' && vNode !== null && Object.getOwnPropertyDescriptor(vNode, SymbolVNode)?.value === true
}

export interface VNodeElement extends VNodeEntity, WithKey, WithNode<HTMLElement> {
    type: 'ELEMENT'
    ref?: Reference<any>
}

export interface VNodeInstanceRoot extends VNodeBase {
    type: 'INSTANCE_ROOT'
    instance: Component
    previousVNodeInstanceReference?: VNodeInstanceReference
    currentVNodeInstanceReference?: VNodeInstanceReference
    elVNode: VNodeElement
}

export interface VNodeConstructor extends VNodeBase, WithKey {
    type: 'CONSTRUCTOR'
    constructor: ComponentConstructor
    instance?: Component
    properties:Record<string,any>
}

export interface VNodeInstanceReference extends VNodeBase {
    type: 'INSTANCE_REFERENCE'
    vNodeInstanceRoot: VNodeInstanceRoot
    isFake: boolean
}

export interface VNodeText extends VNodeBase, WithNode<Text> {
    type: 'TEXT'
    text: string
}

export type VNode = VNodeElement | VNodeInstanceRoot | VNodeInstanceReference | VNodeText|VNodeConstructor



