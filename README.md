# RobotShield

面向 BBC micro:bit 的机械臂与 APP 动作控制扩展。

## 功能

- 四关节控制、独立舵机输出、速度设置和夹爪开合。
- XYZ 坐标移动、关节限位、回初始姿态和复位。
- ADC7828 摇杆读取、配置和 I²C 诊断。
- 姿态记忆与回放；APP 模式支持三组记忆、循环回放和手动中断。
- APP 摇杆、角度及 XYZ 文本解析、动作更新与结果回调。

函数命名空间沿用 `Acebott`。机械臂的限位、校准、复位和 APP 动作调度保留原有逻辑。

## 安装

1. 打开 [MakeCode for micro:bit](https://makecode.microbit.org/)。
2. 新建项目，选择“扩展”，输入：

```text
https://github.com/September535/RobotShield
```

3. 添加 `robotshield`，打开 **RobotShield** 积木分类。

## 示例

- [机械臂搬运](examples/arm-transport.ts) · [说明](docs/arm-transport.md)
- [APP 控制](examples/arm-app.ts) · [指令和接线说明](docs/arm-app.md)
- [速度与复位](examples/arm-smooth-reset.ts)

将一个示例完整复制到 `main.ts`。默认关节输出为 STC0、STC1、STC2、STC3，按实际接线调整。

完整 APP 示例使用 **micro:bit V2**；当前版本在 V1 上会超出程序容量。APP 示例需要另加 MakeCode 的 Bluetooth 扩展。蓝牙 UART、连接事件和指令分发由示例主程序处理；库负责机械臂动作和状态，使用时保留循环中的 `armAppUpdate()`。

## 硬件接口

| 接口 | 用途 |
| --- | --- |
| STC I²C `0x37` | servo0～servo5 舵机输出 |
| micro:bit P2、P12 | servo6、servo7 直连舵机输出 |
| ADC7828 I²C `0x48`～`0x4B` | 摇杆 X、Y、SW 读取 |

`armHomePose()` 回到四关节 90°，保留 XYZ 原点；`armReset()` 回到 90°后重设 XYZ 原点。二者均使用当前动作速度。

接口详见 [API 说明](docs/reference.md)，验证方法见 [测试说明](docs/testing.md)。

## 许可

基于 [September535/ACEBOTT](https://github.com/September535/ACEBOTT) 的机械臂和 APP 控制源码整理。
MIT，保留原 [LICENSE.txt](LICENSE.txt)。
