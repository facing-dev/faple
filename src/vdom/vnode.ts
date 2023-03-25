import type { Component } from '../component/component'
type VNodeType = 'ELEMENT' | 'TEXT' | 'INSTANCE_ROOT' | 'INSTANCE_REFERENCE'

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
}

export interface VNodeElement extends VNodeEntity, WithKey, WithNode<HTMLElement> {
    type: 'ELEMENT'
}

export interface VNodeInstanceRoot extends VNodeEntity, WithNode<HTMLElement> {
    type: 'INSTANCE_ROOT'
    instance: Component
    previousVNodeInstanceReference?:VNodeInstanceReference
}

export interface VNodeInstanceReference extends VNodeBase {
    type: 'INSTANCE_REFERENCE'
    vNodeInstanceRoot: VNodeInstanceRoot
}

export interface VNodeText extends VNodeBase, WithNode<Text> {
    type: 'TEXT'
    text: string
}

export type VNode = VNodeElement | VNodeInstanceRoot | VNodeInstanceReference | VNodeText



