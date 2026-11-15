# 原版街机三国志：来源与部署

## 游戏

- 名称：Warriors of Fate / 街机三国志（吞食天地），CAPCOM CPS1。
- 参考页面：https://www.mhhf.com/game/detail/4274
- 参考页面播放器公开加载的游戏包：https://www.mhhf.com/files/game/19/wof.zip
- 本仓库文件：`roms/wof.zip`，3,944,835 字节。
- SHA-256：`8004d789ee5c234e6252bd3adcbdb44cce1c7d175225091d7c38fa6564f056de`。
- 保持原始游戏包内容，使用原版人物、画面、关卡、骑马与动作。游戏版权属于 CAPCOM，不属于本项目的原创小游戏。
- `assets/wof-original.png` 是使用该游戏包实际运行得到的第一关画面，用于入口预览。

## 播放器

- 独立部署 EmulatorJS v4.2.3：https://github.com/EmulatorJS/EmulatorJS/tree/v4.2.3
- EmulatorJS：GPL-3.0，完整许可证在 `vendor/emulatorjs/LICENSE`。
- `vendor/emulatorjs/emulator.min.js` 为原版前端源码按官方 loader 顺序拼接，保留可读源码与 `src/` 文件；文件名兼容官方加载器，未修改模拟逻辑。
- FBNeo WebAssembly 内核取自 `@emulatorjs/core-fbneo@4.2.3`：https://www.npmjs.com/package/@emulatorjs/core-fbneo/v/4.2.3
- 内核使用单线程 legacy WebGL 构建，适配 GitHub Pages 和手机浏览器，不要求 COOP / COEP 响应头；内核归档内保留其许可证与构建信息。
- ROM、前端、压缩器、中文翻译和内核均同源部署，不依赖第三方站点的跨域 iframe 或运行时热链。

## 操作

手机：摇杆支持八方向，投币 → 开始 → 方向选将 → 攻击确认。攻击按钮按住连击，可关闭连击以使用原始按键；跳跃按钮为第二攻击键，绝招为 A+B 同按，会按原版规则消耗体力。支持多点触控，松手、触摸取消、切后台及暂停会释放按键。

键盘：WASD / 方向键移动，J 攻击，K 跳跃，L 绝招，空格投币，Enter 开始，P 暂停。

## 验证范围

游戏包的 ZIP CRC 已检查。使用 FBNeo 原生内核加载同一 ROM，实际完成投币、开始、选将、第一关骑马移动、攻击和跳跃，并捕获原版游戏帧。此检查验证游戏包和街机输入，不能替代完整浏览器 WebAssembly 启动与手机手感实测。

旧 `play.html?game=warriors` 收藏地址会跳转到 `wof.html`。大厅不再把旧自制引擎当作原版入口。
