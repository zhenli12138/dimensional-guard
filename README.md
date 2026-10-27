# 次元守卫 · 裂隙战役

原生 HTML5 塔防游戏，使用 HTML / CSS / JavaScript 直接运行，WebGL 2 绘制战场，保留 Canvas 2D 回退与可选 WebGPU 后端。不需要 Godot、Blender 或任何 npm 依赖。

## 在线游玩

https://github.com/&lt;你的用户名&gt;/dimensional-guard 部署后，通过 GitHub Pages 访问：

```
https://<你的用户名>.github.io/dimensional-guard/
```

首次加载需下载约 300MB 素材，建议用桌面浏览器（Chrome / Edge / Firefox 最新版）。

## 玩法与操作

- 12 关位于同一张战役地图，每关三颗星，第 4、8、12 关为首领关
- 四位英雄最高 10 级，每人五个技能各三级；四类防御塔、双专精、六条星星天赋
- 左键选择塔、英雄、士兵、怪物，右键取消选择或施法
- 英雄在道路范围内移动，兵营可调整道路集结点

| 按键 | 作用 |
| --- | --- |
| `Q` | 英雄主动技能 |
| `W` | 援军 |
| `E` | 流星雨 |
| `N` | 提前迎敌 |
| `1` | 选择英雄 |
| `空格` / `Esc` | 暂停 |
| `F11` | 全屏 |
| 鼠标中键 / 方向键 | 超宽或窄屏时平移战场 |

## 存档说明

GitHub Pages 是纯静态托管，没有服务端，游戏自动使用浏览器 `localStorage` 本地存档：进度保存在当前浏览器中，清除站点数据或换浏览器会得到全新进度。设置面板里可以导出／导入 JSON 进度备份。

如需多端同步存档，需另行部署 `server/` 目录中的 Node 服务（含访客 Cookie 与 SQLite 存档）。

## 本地运行

静态文件托管即可，例如：

```bash
npx serve .
# 或
python -m http.server 8080
```

`index.html` 使用 ES Module，必须通过 HTTP 访问，`file://` 直接打开会被浏览器的模块安全策略拦截。

## 调试页

- `animation-review.html`：角色动画预览，可选 34 组单位的行走／待机／攻击／受击／战败，支持慢放与脚底线
- `combat-review.html`：旧攻击、塔分支与弹道查看

## 目录

| 路径 | 内容 |
| --- | --- |
| `index.html` | 游戏入口 |
| `main.js` / `bootstrap.js` | 启动与主循环 |
| `battle.js` / `battle-core.js` | 战斗流程与结算 |
| `world.js` / `renderer.js` / `webgpu.js` | 世界逻辑与渲染后端 |
| `ui.js` / `ui-battle.js` / `style.css` | 界面与样式 |
| `assets/` | 地图、图集、音频、字体等运行时素材 |
| `data/` | 关卡与数值 JSON |
| `release-manifest.json` | 带 sha256 的发行文件清单 |

## 版本

5.4.0 · 发行构建包含了 34 组八方向移动图集（2176 个运行时方向帧）、重做的战斗 HUD 与四类接触特效。

## 素材来源与许可

字体与部分音乐为 CC0 / OFL 授权（见 `assets/OFL.txt`）。部分音效提取自 KRV 原版资源，仅用于学习与个人研究，不构成商业授权；如需商用请自行替换。
