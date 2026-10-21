# RobotShield 测试

## 编译

使用项目记录的 MakeCode micro:bit 8.0.21 工具链运行：

```sh
pxt install
pxt build
```

`test.ts` 只引用机械臂、APP 与其控制板依赖，测试函数不自动执行硬件动作。
另将 `examples/arm-app.ts` 放入带 Bluetooth 扩展的项目，检查整份学生程序编译。

## 本次编译结果

工具链：micro:bit 8.0.21 / PXT 12.0.18。

| 项目 | 结果 |
| --- | --- |
| 独立扩展与 `test.ts` | 通过通用目标编译 |
| 原样的 `arm-transport.ts` | 通过通用目标编译 |
| 原样的 `arm-app.ts` + Bluetooth，V2 / `mbcodal` | 通过编译 |
| 完整 APP，V1 / `mbdal` | 超出程序容量 25,948 字节 |

完整 APP 示例使用 micro:bit V2。本次验证未连接实际手机或机械臂。

## MakeCode 界面

1. 在新项目中通过仓库 URL 添加 `robotshield`。
2. 打开 RobotShield 分类，核对机械臂、APP、摇杆和 I²C 积木。
3. 分别复制搬运、APP 和复位示例，切换积木与 JavaScript 并编译。
4. 中文界面下检查关节、速度、记忆组和 APP 积木文字。

## 实机检查

- 确认 STC `0x37` 与实际 ADC 地址可响应，关节通道对应正确。
- 从低速开始检查四关节角度、夹爪范围与关节联动限位。
- 检查 XYZ 移动及边界拒绝，区分保留原点的回位与重设原点的复位。
- 检查摇杆方向、中心停止，以及当前接线对应的 ADC 通道。
- 检查 APP 摇杆、滑块、XYZ 文本格式、三组记忆、循环回放和模式回执。
- 在回放和 XYZ 移动期间发送手动指令或断开蓝牙，确认旧动作被中断。

记录 micro:bit 型号、接线、目标版本和结果。编译通过后仍需手机 APP 与机械臂实机验证。
