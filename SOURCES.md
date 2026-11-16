# 原版游戏：来源与部署

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


## 暴力摩托（Road Rash / 世嘉 MD）

- 版本：Electronic Arts 的 Road Rash 初代（1991），Sega Mega Drive / Genesis，USA / Europe 原版。
- 公开资源页面：https://archive.org/details/no-intro-sega-mega-drive-genesis-roms
- 下载归档：https://archive.org/download/no-intro-sega-mega-drive-genesis-roms/No-Intro%20-%20Sega%20-%20Mega%20Drive%20-%20Genesis/Road%20Rash%20%28USA%2C%20Europe%29.rar
- 使用归档中的 `Road Rash (USA, Europe).md`，原样保存为 `roms/roadrash.md`，786,432 字节，未打补丁或修改游戏内容。
- ROM CRC32：`DEA53D19`；SHA-1：`8ff2b2a58b09c42eeb95f633bd8ea5227ac71358`。与 libretro 数据库的 No-Intro 记录一致：https://github.com/libretro/libretro-database/blob/master/metadat/no-intro/Sega%20-%20Mega%20Drive%20-%20Genesis.dat
- SHA-256：`f7e95580baf30184d4d18a44042ea7a353308a8ed301d8421aed42f7b0f89663`。
- 原版游戏版权属于 Electronic Arts；不是本项目的原创赛车引擎。
- WebAssembly 内核取自 `@emulatorjs/core-genesis_plus_gx@4.2.3`：https://www.npmjs.com/package/@emulatorjs/core-genesis_plus_gx/v/4.2.3
- 独立部署的单线程 legacy 构建 `vendor/emulatorjs/cores/genesis_plus_gx-legacy-wasm.data`，1,204,803 字节，SHA-256：`2a1edeb68d7ec882149ed3cd5d3aa95a6ac231ebabaf82cdb56175a8b62967cc`；沿用 EmulatorJS 4.2.3 前端、解压器及中文翻译。无需 MD BIOS，无需跨域 iframe 或外部运行时游戏热链。
- Genesis Plus GX 原样使用，许可证及各组件声明见 `vendor/emulatorjs/cores/licenses/genesis_plus_gx.txt`，原始来源：https://github.com/libretro/Genesis-Plus-GX/blob/master/LICENSE.txt 。内核禁止商业使用，保留上游声明。
- 原版说明书：https://segaretro.org/images/9/99/Road_Rash_MD_US_Manual.pdf 。标题画面按 START 进入选赛道，左右选择，再按两次 START 出发。A 刹车、B 加速、C 攻击；下 + C 蓄势，松开 C 踢人。对应 libretro joypad：A=1、B=0、C=8、START=3，方向=4/5/6/7。
- `roadrash.html` / `roadrash.js` 是独立 MD 播放器，复用输入源管理与八方向摇杆；`roadrash-controls.js` 提供 MD 按键映射与刹车优先。按住加速持续发送 B，可选择锁定油门；同时转向与攻击不会互相释放。踢人与攻击均按原版按下 / 松开时机触发，不使用街机连发。暂停、切后台、旋转屏幕、离开页面会释放所有按键并解除油门锁定。
- 使用 Genesis Plus GX 原生内核加载同一 No-Intro ROM，完成标题、选赛道、赛前对话和首场比赛，并对比加速、刹车、转向、出拳与踢人的实际游戏帧。`assets/roadrash-original.png` 为实际运行捕获的画面。
- 自动测试覆盖原版 ROM / 内核哈希、多点触控、刹车优先、油门锁定、开始、暂停、后台释放与加载失败重试。此验证不能替代浏览器 WebAssembly 启动和手机真机手感检查。


## 涂鸦跳跃（Doodle Jump / 经典 HTML5 版）

- 接入 https://doodlejump.io/play/ 公开提供的 Phaser 2.6.2 HTML5 游戏；角色、图像与游戏版权属于 Lima Sky，保留原始预载画面中的 Lima Sky / Cloud Games 标识。
- 上游游戏脚本：https://doodlejump.io/play/js/build/production.min.js 。原始脚本 SHA-256：`61e62763c38c0f20aef448b2bd8c6340369a1d6b4f51b30466619b6e26a36e91`。
- 自托管完整平台、弹簧、怪物、射击、螺旋帽、火箭背包与计分逻辑；没有以另一个自制平台引擎替换游戏。此项是 HTML5 网页版本，来源站点不隶属于 Lima Sky。
- `vendor/doodle/game.js` 保留上游完整脚本，外加两项作用域包装：将直接存储访问映射至安全的独立存储适配器；停用游戏旧式 FullTilt 递归帧循环，由宿主在每帧原生游戏更新后应用感应速度。Phaser 自身的帧调度保持原样，重开不会累积旧感应循环。
- `vendor/doodle/assets/` 包含上游的所有 WebP 图集、角色、位图字体、关卡数据和 MP3 音效。上游列出的 OGG 文件不可用；本项目使用 ffmpeg / libvorbis 从相同 MP3 生成 OGG 作为兼容格式。`vendor/doodle/manifest.json` 记录每个文件的字节数、SHA-256 与转换说明。
- Phaser 2.6.2：https://cdnjs.cloudflare.com/ajax/libs/phaser/2.6.2/phaser.min.js ，MIT 许可证见 `vendor/doodle/PHASER-LICENSE.txt`；完整 Phaser 源码：https://github.com/photonstorm/phaser/tree/v2.6.2 。
- 大厅预览图：https://doodlejump.io/thumbs/doodle-jump.webp ，本地 `assets/doodle-preview.webp`。
- `doodle-motion.js` 实现 HTTPS 下的 DeviceOrientationEvent 用户点击授权、横竖屏轴转换、首次自然握持校准、死区、平滑、速度上限、无数据回退，以及暂停后的新样本校准。感应数据只在浏览器内使用。
- `doodle.js` 负责载入、进度、错误重试、安全存储、最高分、暂停、全屏与原游戏输入适配。左右触控与键盘可覆盖感应，松手后恢复感应；切后台、旋转屏幕、离开页面释放按键并清空感应速度。默认静音；画面内与宿主暂停保持同步。
- 自动测试覆盖感应授权同一用户操作、拒绝 / 异常 / 无设备回退、无样本超时、横竖屏轴、校准、停滞 / 恢复、授权竞态、触控并发、原游戏暂停与后台暂停、存储异常、资源哈希，以及直接执行上游的普通 / 断裂 / 一次性平台碰撞和弹簧、火箭背包逻辑。
- 当前环境没有可用的浏览器预览工具；没有完成浏览器整局运行或手机真机传感器、声音与手感实测。
