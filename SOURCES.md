# 原版街机游戏：来源与部署

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


## 合金弹头1（Metal Slug / Neo Geo）

- 原版游戏：1996 年 NAZCA / SNK 的 Metal Slug 初代。
- 参考页面：https://www.mhhf.com/game/detail/509
- 参考页面公开加载的游戏包：https://www.mhhf.com/files/game/19/mslug.zip
- 原始 ZIP 大小：14,779,872 字节；SHA-256：`ef3ef3de26a6d79372d99b5d902a702cf247fb4f810d108264a630788c572370`。
- 游戏包自身已包含所需 Neo Geo 系统 ROM，无需另行下载 BIOS。
- 仓库以 `roms/mslug.part1.bin` 至 `mslug.part3.bin` 三段存储，由 `roms/mslug.json` 描述大小与 SHA-256；`rom-loader.js` 在浏览器中逐段校验、按序合并，再校验完整 ZIP。合并结果与参考页面的原始 ZIP 逐字节一致，未修改游戏内容。
- 使用与三国志相同的本地 EmulatorJS 4.2.3 / FBNeo 单线程 legacy 内核；合并后的 Blob 名称保留 `mslug.zip`，供街机驱动识别。
- 输入：射击为 joypad 0，跳跃为 8，手雷为 1。手雷是单独的 Neo Geo C 键，不使用三国志的 A+B 宏。保留原版生命、弹药、手雷数量、救援、武器与载具规则。
- 已使用 FBNeo 原生内核运行同一完整 ZIP，完成投币、开始并进入第一关；实际验证移动、射击、跳跃，以及投掷手雷后数量减少。`assets/mslug-original.png` 为该运行过程捕获的游戏画面。
- 这不替代浏览器 WebAssembly 和手机真机手感验证。
- 旧 `play.html?game=commando` 地址自动转到 `mslug.html`；大厅不再使用旧自制横版引擎作为合金弹头入口。
