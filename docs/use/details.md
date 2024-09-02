# 详细功能

## 托盘

一般操作系统的托盘位于屏幕右上角或右下角，**eSearch**首次运行时，会在托盘出显示图标<img height="16" src="./assets/icon.svg">。

左键点击托盘图标，进行截屏搜索。

右键点击托盘按钮，它会弹出几个选项：

### 自动识别

如果你选中了屏幕上的某些文字，**eSearch**将直接搜索它，否则开启文字识别识别屏幕文字。

### 截屏搜索

识别框选的屏幕内容进行搜索，也可以进行编辑、保存等操作。

### 选中搜索

搜索你选中的文字，即划词搜索。

### 剪贴板搜索

搜索最近复制的文字。

## 截屏界面

### 选区

默认设置下，与截屏前显示一样的、鲜艳的色彩区域为选区，选区外则是灰暗的。初始截屏默认全屏选区，这意味着选中了整个屏幕，屏幕没有灰暗处。

在某个位置按下鼠标左键，将在此处生成一个选区，拖动光标，选区也随之改变。释放鼠标左键，选区将不再随鼠标变化。

光标位于选区边缘或选区中间时，光标会改变形状，提示可以拖动。你可以向窗口一样，通过拖动改变选区大小、位置。

#### 自动框选

利用 OpenCV 进行图像边缘识别，视觉上重要的选区（图标、文字、导航栏等）可能被识别。光标悬停在某些选区内，他们会自动框出，点击，即可框选该选区。

高级设置中的最小阈值和最大阈值是边缘识别算法的参数，你若觉得自动框选不准确，并有相关的知识，可以进行修改。[参考](https://docs.opencv.org/4.x/d7/de1/tutorial_js_canny.html)

### 大小栏

大小栏位于选区上方。分别以像素为单位显示

选区左上角 x 坐标, 选区左上角 y 坐标 选区右下角 x 坐标, 选区右下角 y 坐标 选区长 × 选区宽

等数字。

大小栏的数字可编辑，光标点击你想更改的数字，改变后按下回车键 ↵，即可把数字应用到选区。注意部分数字会随其他数字的改变而改变。

### 鼠标栏

鼠标栏一直跟随着光标，从上到下依次显示放大镜、坐标、颜色代码。

#### 放大镜

放大镜是由若干色块组成的色彩阵，反映了光标位置下屏幕放大后的效果，每个色块都有与之对应的屏幕像素。处于正中间的色块是光标对应屏幕所在位置，他的坐标显示在下面的坐标区。

若色块有灰色边框，整体偏暗，还有些透明，说明它对应的屏幕像素在选区外。

通过放大镜，你可以清除知道光标所在位置，可以更精确进行操作。

#### 颜色代码

展示了光标所在像素的颜色代码，不同的代码格式可以在设置中选择，目前支持：HEX、RGB、HSL、HSV 和 CMYK 格式的代码。

#### 更多

右击，鼠标栏将收起放大器，展开颜色代码（所有格式代码，可点击复制），显示选区大小。再次右击可收起。

### 工具栏

展示主要功能按钮。

若设置了“框选后默认操作”，对应的功能按钮背景将加深。若想临时取消操作，请用鼠标中键（即滚轮）点击按钮。

工具栏会在完成选区框选后自动移动到选区旁。你可以在设置选择展示内容优先或效率优先。

#### 展示内容优先

例如：若工具栏将要移动选区左侧，但超出了屏幕，他会移动到选区右侧。若右侧也超出了屏幕，工具栏只能在工具栏左侧内。这种模式最大程度保证工具栏不会遮挡选区，但有可能光标要跨过一个选区点击按钮，效率不高。

#### 效率优先

例如：若工具栏将要移动选区左侧，但超出了屏幕，他会移动到选区左侧内，尽管遮挡了选区内容。这种模式保证工具栏尽可能靠近光标，便于提升效率，但它遮挡了选区内容。

#### 移动

右键按住工具栏任意位置，即可通过拖动改变工具栏位置。

### 保存

按下保存按钮，将弹出提示框来选择文件格式。目前支持 PNG、JPG、WebP 和 SVG 格式。

SVG 格式是一种可编辑矢量格式，但保存到文件里的截屏是栅格格式，只有图像编辑产生的形状（除了滤镜外）是矢量格式，便于后期修改。

## <img height="16" src="./assets/icons/draw.svg">图像编辑

### 元素

元素包括笔迹、形状、文字、滤镜等。点击或通过光标拖拉以此选中元素。元素（除了滤镜）被选中后可拖动中间部分来移动，或拖动八个方向的拖块来改变大小，还可以拖动最顶部的拖块来旋转。所有元素都可以通过按下 Delete 键来删除。

### 自由绘画

有画笔、橡皮和喷刷。画笔阴影可以为笔迹添加阴影，使画笔拥有荧光笔性质。

### 形状

#### 线条、圆和矩形

像框选选区一样，选择相应形状后，按下左键并拖动，以此添加形状。

#### 折线和多边形

选择形状后，在你想要的起始位置点击，然后依次点击下一个点来画线，最后在终点双击即可结束画图。多边形会自动闭合形状，例如五边形你只需画四条线。

#### 文字

在你想要的位置点击即可生成文本框。

### 滤镜

选择滤镜，拖拉出矩形滤镜区域即可添加。部分滤镜可调节风格程度，如马赛克大小等。

### 颜色和大小

通过点击第一个按钮，可以切换填充颜色和边框颜色设置。线条、箭头等只能更改边框颜色。

上面为颜色输入框，支持输入 CSS 颜色，下半部分可调节不透明度。

#### 色盘

点击颜色，颜色将适用到颜色代码区聚焦位置。原先的不透明度将重设为 100%。右击该颜色，色盘将显示相同色系的更多颜色。再次右击回到主色盘。

### 层次

选择形状、文字、滤镜等元素后，可通过按钮改变他们的层叠顺序。注意，选择元素后，他在视觉上会自动移动到最顶层，实际位置以不选中元素时的位置为准。

### 操作

支持撤销、重做、复制和删除四种操作，复制和删除只针对画布上的元素。撤销和重做针对画布和框选。

#### 复制

相当于电脑中的“复制（拷贝）+粘贴”或 macOS 系统中的“复制”。将会生成画布元素的副本在旁边，你可以在设置调节副本相对蓝本的位置。

#### 删除

选中元素后，进行删除，把他们移除画布。

## <img height="16" src="./assets/icons/ocr.svg">文字识别（OCR）

文字识别可以把框选的图片的文字转化为可编辑的文字在主页面显示。

**eSearch**提供了**离线 OCR**和其他**在线 OCR**，可以在设置中选择。也可以点击按钮右上角的圆点切换。

结果将在[主页面](#主页面)展示。

### 离线 OCR

离线 OCR 完全免费，不依赖网络，但它体积较大。部分在线 OCR 可以免费体验，但它速度快，准确率高，不占体积。**eSearch**默认启用离线 OCR，可以直接使用。

### 在线 OCR

**eSearch**目前支持的在线 OCR 服务是**百度 OCR**和**有道 OCR**。

#### 百度 OCR

参考[百度 OCR 的教程](https://cloud.baidu.com/doc/OCR/s/dk3iqnq51)，获取 API Key 和 Secret Key，并填入设置中。截止 2022 年 1 月，百度 OCR 还可以免费领取服务。

#### 有道 OCR

参考[有道 AI 文档](https://ai.youdao.com/doc.s#guide)，在创建应用时服务选择*光学字符识别服务-通用文字识别*，接入方式为*API*，获取应用 ID 和密钥，并填入设置中。

## <img height="16" src="./assets/icons/search.svg">以图搜图

以图搜图可以把你选中的图片，通过互联网引擎进行搜索，并通过浏览器展示引擎的搜索结果。

可以在设置选择引擎，也可以点击按钮右上角的圆点切换。

## <img height="16" src="./assets/icons/scan.svg">扫描二维码

结果将在[主页面](#主页面)展示。

## <img height="16" src="./assets/icons/record.svg">录屏

按下按钮后，软件会先提醒你选择保存位置，然后打开录制栏。

### 录制栏

初始化完毕后，录制栏按钮变的可用。录制栏提供基本操作，开启或停止录制，暂停或继续录制，若你的电脑插入了摄像头或麦克风，将显示有关按钮。按住中间显示的时间区域可拖动录制栏。还有最小化和关闭按钮。

开启或停止录制的快捷键是 Win+R，开始录制后，录制按钮变成方形，表示已开始录制。录制途中你可以自由开关摄像头或麦克风（前提是他们可用）。请记住，凡是麦克风和摄像头，都应该当成开着的，我不能 100%保证摄像头或麦克风完全关闭，有一个系统级开关甚至物理开关是最好的。目前暂不支持录制时再次进行录制。

录制结束后，将显示编辑（转换）模式，你可以预览、裁切、转换格式、编辑帧率和码率。编辑完成后按下保存键完成，否则视为放弃。你可以在设置开启自动转换，这样就不需要每次都编辑了。

## <img height="16" src="./assets/icons/long_clip.svg">广截屏

即滚动截屏。

框选并按下广截屏按钮后，屏幕将绘制框选框，你需要通过鼠标滚轮或方向键手动缓慢滚动页面。各个方向都可以滚动。部分情况下软件可以实时预览滚动效果。滚动完后，点击右下角红点以结束截屏。此时编辑界面会弹出。

> [!TIP]
>
> 在特定的操作系统或桌面环境下，广截屏可能出现问题，比如 macOS 和 Wayland 无法识别滚动和结束截屏。
> 设置里提供了一个选项，可以设置为定时截屏拼接，以及通过快捷键结束截屏。

## <img height="16" src="./assets/icons/main.svg">主页面

当你按下 <img height="16" src="./assets/icons/ocr.svg">文字识别或 <img height="16" src="./assets/icons/scan.svg">扫描二维码后，若识别成功，**eSearch**将弹出主页面。

### 搜索和翻译

按下按钮，**eSearch**将对全文进行相应的搜索或翻译操作。如果不想搜索或翻译全文，可以用鼠标选区部分文字，这样可以搜索或翻译部分文字。

### 编辑栏

选中时，文字旁边弹出一个编辑栏。

你可以进行<img height="16" src="./assets/icons/link.svg">打开链接、<img height="16" src="./assets/icons/search.svg">搜索、<img height="16" src="./assets/icons/translate.svg">翻译等操作。

### 自动删除换行

OCR 识别后，可能不保留排版，而是产生多余的换行，使用自动删除换行，可以识别多余换行并删除。

### 图片区

图片区用于对照原始图片与文字识别后的文字，便于校对。

在图片区上选择，松手后即可同步选择到编辑区，即使更改了编辑区文字也能自动匹配。

### 历史记录

点击历史记录，可以查看之前在主页面的文字记录。手动编辑后的文字不会自动保存到历史记录，除非你按下保存到历史记录按钮。

## <img height="16" src="./assets/icons/search.svg">引擎

引擎包括 ocr 引擎、以图搜图引擎、搜索引擎和翻译引擎。

### 默认引擎

选定一个默认引擎，点击相关识别搜索按钮后会调用该引擎。

### 切换引擎

点击 ocr 引擎、以图搜图引擎按钮右上方圆点处可展开引擎选择。

点击搜索引擎和翻译引擎按钮右边下拉框可展开引擎选择。

选择引擎后，操作将使用选择的引擎。

### 记住上次引擎选择

勾选此项后，默认展示的引擎不再是之前选择的默认引擎，取而代之的是上次使用过的引擎。

此时引擎仍然可以改变选择，使用改变的引擎后，将记录下来，用作下一次引擎的展示。

### 自定义搜索和翻译引擎

“搜索”或“翻译”的引擎是可以更改甚至在设置中自定义 常用引擎推荐（不一定好用，请根据自身选择合适引擎）：

搜索引擎:

```
Google, https://www.google.com/search?q=%s
百度, https://www.baidu.com/s?wd=%s
必应, https://cn.bing.com/search?q=%s
Yandex, https://yandex.com/search/?text=%s
搜狗, https://www.sogou.com/web?query=%s
夸克, https://quark.sm.cn/s?q=%s
神马, https://yz.m.sm.cn/s?q=%s
微信, https://weixin.sogou.com/weixin?type=2&query=%s
知乎, https://www.zhihu.com/search?type=content&q=%s
微博, https://s.weibo.com/weibo?q=%s
github, https://github.com/search?q=%s
bilibili, https://search.bilibili.com/all?keyword=%s
优酷, https://so.youku.com/search\_video/q\_%s
腾讯, https://v.qq.com/x/search/?q=%s
爱奇艺, https://so.iqiyi.com/so/q\_%s
```

翻译引擎:

```
Google, https://translate.google.com.hk/?op=translate&text=%s
Deepl, https://www.deepl.com/translator#any/any/%s
金山词霸, http://www.iciba.com/word?w=%s
百度, https://fanyi.baidu.com/#auto/auto/%s
腾讯, https://fanyi.qq.com/?text=%s
```

## <img height="16" src="./assets/icons/browser.svg">搜索窗口

搜索窗口是**eSearch**自带的一个简单的浏览器，在主页面上生成。

若设置了浏览器中打开，搜索的链接将在系统默认的浏览器打开，否则，将在搜索窗口打开。

### 标签页管理

在标签页中打开链接，他可能在新标签页中打开。新标签页建立在右侧。当标签页过多时，他们不会变短，而是让整个标签页区域可滚动。令其向上滚动，他将向右滚动。如果你的鼠标或触摸板支持横向滚动，那他的滚动正常。

标签页可使用关闭按钮、鼠标中键或鼠标右键关闭，关闭后将展示左边的标签页。所有标签页关闭后，搜索窗口将关闭。

### 保存到历史记录

搜索窗口不支持历史记录。如果你搜索到重要的内容，可以点击添加到历史记录，此时浏览的标签页网址将保存到主要历史记录，可在主页面查看。

### 浏览器打开

即使你打开了搜索窗口，你仍然可以通过浏览器打开按钮在浏览器打开当前标签页的网址。在设置中勾选是否在浏览器打开后自动关闭标签页。

## <img height="16" src="./assets/icons/ding.svg">ding

截屏界面按下 <img height="16" src="./assets/icons/ding.svg">固定（ding）在屏幕上后，选取的区域将变成一个窗口放在屏幕上。

鼠标按住可拖动窗口，滚轮滚动可进行缩放。鼠标放在窗口上，顶部弹出工具栏。

可以改变窗口透明度和大小，可以最小化、[归位](#归位)和关闭。

### 归位

归位可以让窗口回到最开始位置和大小，于原来截屏位置贴合以至于无法察觉。

### dock

在屏幕左上角会常驻竖向条形的提示条，点击它，可以展开 dock 栏，进行 ding 窗口最小化还原或关闭。

## 屏幕翻译

将对图片进行文字识别，并翻译成你选择的语言。

这在图表等翻译中适用，既能达到翻译效果，又可以看见图形关系。

需要设置翻译引擎。

## 设置

### 放弃保存设置

若在某次设置中不清楚错误设置了什么，请选中右下角放弃保存设置按钮，随后关闭设置即可。

### 代理

固定服务器模式下，可分别设定 https、http、ftp、socks 代理，在相应框选填入服务器 URL 即可。可填入多个 URL，使用逗号分开。