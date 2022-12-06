import { Component } from './mvvm'

export default class Test extends Component {
    num = 1
    arr = [0, 1, 2, 3]
    constructor() {
        super()
    }
    mounted(){
    }
    render() {
        return <div id="xx" f={123} >
            <div style="color:red" key={this.num}>{
            this.num
        }</div>
            <div onClick={() => {
                this.num++
                this._update()
            }}>plus</div>
            <div>----
                {this.arr.map(ite => <div>{ite}</div>)}
                --- </div>
            <div onClick={() => { this.arr.push(this.arr.length); this._update() }}>push</div>
            <div onClick={() => { this.arr.pop(); console.log(this.arr); this._update() }}>pop</div></div>
    }
}