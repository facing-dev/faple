import x from './test.jsx'

console.log(x)

function component() {
    const element = document.createElement('div');
    return element;
}

document.body.appendChild(component());
