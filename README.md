## 前言
现在前端面试Vue中都会问到响应式原理以及如何实现的，如果你还只是简单回答通过Object.defineProperty()来劫持属性可能已经不够了。

本篇文章通过学习文档及视频教程`实现手写`一个简易的Vue源码实现数据双向绑定，解析指令等。

### 几种实现双向绑定的做法
目前几种主流的mvc(vm)框架都实现了单向数据绑定，而我所理解的双向数据绑定无非就是在单向绑定的基础上给可输入的元素(input, textare等)添加了change(input)事件，来动态修改model和view，并没有多高深，所以无需太过介怀是实现的单向或双向绑定。

#### 实现数据绑定的做法有大致如下几种：

`发布者-订阅者模式（backbone.js）`

`脏值检查(angular.js)`

`数据劫持(Vue.js)`

* 发布者-订阅者模式

一般是通过sub, pub的方式来实现数据和试图的绑定坚听，更细数据方法通常做法是vm.set('property', value)
这种方式现在毕竟太low来，我们更希望通过vm.property = value这种方式更新数据，同时自动更新视图，于是有来下面两种方式。
* 脏值检查

angular.js是通过脏值检测的方式对比数据是否有变更，来决定是否更新视图，最简单的方式就是通过setInterval()定时轮询检测数据变动，当然Google不会这么low，angular只有在制定的事件触发时进入脏值检测，大致如下

```
* DOM事件，臂如用户输入文本，点击按钮等(ng-click)
* XHR响应事件($http)
* 浏览器location变更事件($location)
* Timer事件($timeout, $interval)
* 执行$diaest()或¥apply()
```
* 数据劫持

Vue.js则是通过数据劫持结合发布者-订阅者模式的方式，通过`Object.defineProperty()`来劫持各个属性的`setter`,`getter`，在数据变动时发布消息给订阅者，触发相应的监听回调。

![](https://user-gold-cdn.xitu.io/2020/1/12/16f99854343f87c9?w=1131&h=522&f=png&s=61348)

## Vue源码实现

index.html
```
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<title></title>
		<script type="text/javascript" src="./compile.js"></script>
		<script type="text/javascript" src="./observe.js"></script>
		<script type="text/javascript" src="./myvue.js"></script>
	</head>
	<body>
		<div id="app">
			<h2>{{person.name}} -- {{person.age}}</h2>
			<h3>{{person.sex}}</h3>
			<ul>
				<li>1</li>
				<li>2</li>
				<li>3</li>
			</ul>
			<div v-text="msg"></div>
			<div>{{msg}}</div>
			<div v-text="person.name"></div>
			<div v-html="htmlStr"></div>
			<input type="text" v-model="msg" />
			<button type="button" v-on:click="btnClick">v-on:事件</button>
			<button type="button" @click="btnClick">@事件</button>
		</div>
		<script type="text/javascript">
			let vm = new Myvue({
				el: '#app',
				data: {
					person: {
						name: '只会番茄炒蛋',
						age: 18,
						sex: '男'
					},
					msg: '学习MVVM实现原理',
					htmlStr: '<h1>我是html指令渲染的</h1>'
				},
				methods: {
					btnClick() {
						console.log(this.msg)
					}
				}
			})
		</script>
	</body>
</html>
```
### 第一步 - 实现一个指令解析器(Compile)
compile主要做的事情是解析模板指令，将模板中的变量替换成数据，然后初始化渲染页面视图，并将每个指令对应的节点绑定更新函数，添加监听数据的订阅者，一旦数据有变动，收到通知，更新视图

myvue.js
```
// 工具类根据指令执行对应方法
const compileUtils = {
	/*
	 * node 当前元素节点
	 * expr 当前指令的value
	 * vm 当前Myvue实例, 
	 * eventName 当前指令事件名称
	 */

	// 由于指令绑定的属性有可能是原始类型,也有可能是引用类型, 因此要取到最终渲染的值
	getValue(expr, vm) {
		// reduce() 方法对数组中的每个元素执行一个由您提供的reducer函数(升序执行)，将其结果汇总为单个返回值。
		return expr.split('.').reduce((data, currentVal) => {
			return data[currentVal]
		}, vm.$data)
	},
	// input双向数据绑定
	setValue(expr, vm, inputVal) {
		// reduce() 方法对数组中的每个元素执行一个由您提供的reducer函数(升序执行)，将其结果汇总为单个返回值。
		return expr.split('.').reduce((data, currentVal) => {
			// 将当前改变的值赋值
			data[currentVal] = inputVal
			console.log(data);
		}, vm.$data)
	},

	// 处理{{person.name}}--{{person.age}}这种格式的数据,不更新值的时候会全部替换了
	getContentVal(expr, vm) {
		return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
			// 获取{{}}中的属性
			return this.getValue(args[1], vm)
		})

	},
	// 这里简单就封装了几个指令方法
	text(node, expr, vm) {
		let value;
		// 处理{{}}的格式
		if (expr.indexOf('{{') !== -1) {
			value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
				// 绑定观察者
				new Watcher(vm, args[1], (newValue) => {
					// 处理{{person.name}}--{{person.age}}这种格式的数据,不然更新值的时候会全部替换了
					this.upDater.textUpDater(node, this.getContentVal(expr, vm))
				})
				// 获取{{}}中的属性
				return this.getValue(args[1], vm)
			})
		} else {
			new Watcher(vm, expr, (newValue) => {
				this.upDater.textUpDater(node, newValue)
			})
			// 获取当前要节点要更新展示的值
			value = this.getValue(expr, vm)
		}
		// 更新的工具类
		this.upDater.textUpDater(node, value)
	},
	html(node, expr, vm) {
		const value = this.getValue(expr, vm)
		// 绑定观察者
		new Watcher(vm, expr, (newValue) => {
			this.upDater.htmlUpDater(node, newValue)
		})
		// 更新的工具类
		this.upDater.htmlUpDater(node, value)
	},
	model(node, expr, vm) {
		const value = this.getValue(expr, vm)
		// 绑定观察者
		new Watcher(vm, expr, (newValue) => {
			this.upDater.modelUpDater(node, newValue)
		})
		node.addEventListener('input', (e) => {
			// 设置值
			this.setValue(expr, vm, e.target.value)
		})
		// 更新的工具类
		this.upDater.modelUpDater(node, value)
	},
	on(node, expr, vm, eventName) {
		// 获取当前指令对应的方法
		const fn = vm.$options.methods && vm.$options.methods[expr]
		// console.log(fn);
		node.addEventListener(eventName, fn.bind(vm), false)
	},
	// 更新的工具类
	upDater: {
		// v-text指令的更新函数
		textUpDater(node, value) {
			node.textContent = value
		},
		// v-html指令的更新函数
		htmlUpDater(node, value) {
			node.innerHTML = value
		},
		// v-model指令的更新函数
		modelUpDater(node, value) {
			node.value = value
		}
	}
}

// Myvue
class Myvue {
	constructor(options) {
		this.$el = options.el;
		this.$data = options.data;
		this.$options = options;
		if (this.$el) {
			// 1.实现一个数据观察者
			new Observe(this.$data)

			// 2.实现一个指令解析器
			new Compile(this.$el, this)

			// 3.实现this代理, 访问数据可以直接通过this访问
			this.proxyData(this.$data)
		}
	}
	proxyData(data) {
		for (const key in data) {
			Object.defineProperty(this, key, {
				get() {
					return data[key]
				},
				set(newValue) {
					data[key] = newValue
				}
			})
		}
	}
}
```
compile.js

```
// 指令解析器
class Compile {
	constructor(el, vm) {
		// 判断当前传入的el是不是一个元素节点
		// document.querySelector返回与指定的选择器组匹配的元素的后代的第一个元素。
		this.el = this.isElementNode(el) ? el : document.querySelector(el)
		this.vm = vm
		// 1.匹配节点内容及指令替换相应的内容, 因为每次匹配替换会导致页面回流和重绘, 所以使用文档碎片对象
		// 获取文档碎片对象, 放入内存中会减少页面的回流和重绘
		const fragment = this.node2Fragment(this.el)

		// 2.编译模版
		this.compile(fragment)

		// 3.追加子元素到根元素
		this.el.appendChild(fragment)

	}

	// 判断是否是元素节点
	isElementNode(node) {
		return node.nodeType === 1
	}

	// 将当前根元素中的所有子元素一层层取出来放到文档碎片中, 以减少页面回流和重绘
	node2Fragment(el) {
		// 创建文档碎片对象
		const fragment = document.createDocumentFragment()
		let firstChild;
		// 将当前el节点对象的所有子节点追加到文档碎片对象中
		while (firstChild = el.firstChild) {
			fragment.appendChild(firstChild)
		}
		return fragment
	}

	// 编译模版, 解析指令
	compile(fragment) {
		// 1.获取到所有的子节点, 当前获取的子节点数组是一个伪数组, 需要转为数组
		const childNodes = [...fragment.childNodes]
		childNodes.forEach(child => {
			// 判断当前节点是元素节点还是文本节点
			if (this.isElementNode(child)) {
				// 编译元素节点
				this.compileElement(child)
			} else {
				// 编译文本节点
				this.compileText(child)
			}
			// 递归遍历当前节点时候还有子节点对象
			if (child.childNodes && child.childNodes.length) {
				this.compile(child)
			}
		})

	}

	// 编译元素节点
	compileElement(node) {
		// 根据不同指令属性, 编译模版信息
		const attributes = [...node.attributes];
		attributes.forEach(attr => {
			// 通过解构将指令的name和value获取到
			const {
				name,
				value
			} = attr
			// 判断当前属性是指令还是原生属性
			if (this.isDirective(name)) {
				// 截取指令, 不需要v-
				const directive = name.split('-')[1]
				// 由于指令格式有 v-text v-html v-bind:属性 v-on:事件等等, 按照 : 再次分割
				const [dirName, eventName] = directive.split(':')
				// 更新数据, 数据驱动视图
				compileUtils[dirName](node, value, this.vm, eventName)
				// 删除有指令的标签上的属性
				node.removeAttribute('v-' + directive)
			} else if (this.isEventName(name)) { // 判断指令是以@开头绑定的事件
				// 截取指令, 不需要@, 这里就省略处理里 @click.stop.prevent等事件修饰符, 原理不难
				const eventName = name.split('@')[1]
				// 更新数据, 数据驱动视图
				compileUtils['on'](node, value, this.vm, eventName)
			}
		})
	}

	// 编译文本节点
	compileText(node) {
		// node.textContent获取文本并且匹配{{}} 模版字符串类型的
		const content = node.textContent
		if (/\{\{(.+?)\}\}/.test(content)) {
			compileUtils['text'](node, content, this.vm)
		}
	}

	// 判断当前属性是指令还是原生属性
	isDirective(attrName) {
		// startsWith() 方法用来判断当前字符串是否以另外一个给定的子字符串开头，并根据判断结果返回 true 或 false。
		return attrName.startsWith('v-')
	}

	// 判断指令是以@开头绑定的事件
	isEventName(attrName) {
		return attrName.startsWith('@')
	}
}
```

### 第二步 - 实现一个数据监听器(Observer)
利用Obeject.defineProperty()来监听属性变动 那么将需要observe的数据对象进行递归遍历，包括子属性对象的属性，都加上 setter和getter 这样的话，给这个对象的某个值赋值，就会触发setter，那么就能监听到了数据变化。

observer.js

```
// 数据劫持
class Observe {
	constructor(data) {
		this.observe(data)
	}
	// 使用object.defineProperty监听对象, 数组暂时不考虑,太复杂
	observe(data) {
		if (data && typeof data === 'object') {
			// console.log(data);
			Object.keys(data).forEach(key => {
				this.defineReactive(data, key, data[key])
			})
		}
	}

	// 劫持属性
	defineReactive(obj, key, value) {
		// 递归遍历
		this.observe(value)
		// 创建依赖收集器
		const dep = new Dep()
		// console.log(dep);
		Object.defineProperty(obj, key, { // obj为已有对象, key为属性, 第三个参数为属性描述符
			enumerable: true, // enumerable：是否可以被枚举(for in)，默认false
			configurable: false, // 是否可以被删除，默认false
			// 获取
			get() {
				// console.log(dep.target);
				// 订阅数据变化时, 往Dep中添加观察者
				Dep.target && dep.addSub(Dep.target)
				return value
			},
			// 设置
			set: (newValue) => {
				// 这里要注意新设置的值也需要劫持他的属性
				this.observe(newValue)
				if (newValue !== value) {
					value = newValue
				}
				// 通知订阅器找到对应的观察者,通知观察者更新视图
				dep.notify()
			}
		})
	}
}
```
### 第三部 - 实现一个Watcher去更新视图
在初始化myvue实例的时候，通过object。defineProperty()的get属性时去添加观察者，在set更改属性的时候去触发notify()来调用upDate方法更新视图
```
// 观察者
class Watcher {
	constructor(vm, expr, cb) {
		this.vm = vm
		this.expr = expr
		this.cb = cb
		// 存储旧值
		this.oldValue = this.getOldValue()
	}
	// 获取旧值
	getOldValue() {
		// 在获取旧值的时候将观察者挂在到Dep订阅器上
		Dep.target = this
		const oldValue = compileUtils.getValue(this.expr, this.vm)
		// 销毁Dep上的观察者
		Dep.target = null
	}

	// 更新视图
	upDate() {
		// 获取新值
		const newValue = compileUtils.getValue(this.expr, this.vm)
		if (newValue !== this.oldValue) {
			this.cb(newValue)
		}
	}
}

// 订阅器
class Dep {
	constructor() {
		this.subs = []
	}
	// 收集观察者
	addSub(watcher) {
		this.subs.push(watcher)
	}
	// 通知观察者去更新视图
	notify() {
		this.subs.forEach(watcher => {
			watcher.upDate()
		})
	}
}
```
### 总结
本篇文章主要以`几种实现双向绑定的做法`、`实现Observer`、`实现Compile`、`实现Watcher`、`实现MVVM`这几个模块来阐述了双向绑定的原理和实现。并根据思路流程渐进梳理讲解了一些细节思路和比较关键的内容点，当然肯定有很多不完善的地方，但是对于如何实现双向数据绑定你肯定有了更加深刻的了解。

本篇文章也是通过查看Vue源码解析文章，以及B站相关视频总结出来的，俗话说好记性不如烂笔头， 自己即使照着抄一遍也能更加印象深刻。

最后，感谢您的阅读！

[源码地址](https://github.com/zhihuifanqiechaodan/abu673395239-Vue)