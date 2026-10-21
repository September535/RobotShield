# RobotShield API

所有函数位于 `Acebott` 命名空间。

## 机械臂动作

| 函数 | 用途 |
| --- | --- |
| `armInitialize(chassis, shoulder, elbow, claws)` | 仅配置四关节输出通道，不自动设置角度或重置坐标原点 |
| `armSetJoint(joint, angle, speed)` | 设置一个关节的角度和速度 |
| `armSetPose(chassis, shoulder, elbow, claws)` | 更新四关节姿态，并保留限位检查 |
| `armSetSpeed(speed)` | 设置慢、中、快档位，作用于关节、复位和 XYZ 移动 |
| `armClaw(state)` | 夹爪张开至 150°或闭合至 90° |
| `armHomePose()` | 四关节回 90°，保留 XYZ 原点 |
| `armReset()` | 四关节回 90°，完成后将该姿态设为 XYZ 原点 |
| `armSetPosition(x, y, z)` | 按现有校准和限位执行 XYZ 移动 |
| `armGetCoordinate(axis)` | 读取根据目标角度和校准估算的坐标 |
| `armGetJointAngle(joint)` | 读取库接受的关节目标角度 |
| `armMemory(mode)` | 保存、运行或删除姿态；APP 模式支持扩展录制与回放操作 |

初始化不会读取或改变舵机实际位置。需要设置初始姿态时，由主程序显式调用关节、姿态、回位或复位积木。

关节角度和坐标来自库的状态与模型，不代表传感器实测位置。

## 摇杆与控制板

| 函数 | 用途 |
| --- | --- |
| `adc7828SetAddress(address)` | 设置摇杆 ADC 的 I²C 地址 |
| `adc7828ReadChannel(channel)` | 读取 ADC7828 的 12 位原始值 |
| `armSetJoystick(side, xChannel, yChannel, swChannel)` | 配置机械臂摇杆并启动后台读取 |
| `armReadJoystick(side, value)` | 读取配置好的摇杆通道 |
| `stcServoAngle(channel, degree)` | 控制 STC 舵机输出 |
| `i2cAddressRead()` / `i2cAddressCheck(address)` | 串口扫描或检查 I²C 设备 |

兼容接口 `armBaseControl`、`chassisControl`、`shoulderControl`、`elbowControl`、`clawsControl` 以及 STC/ADC 初始化检查继续保留。

## APP 控制

| 函数 | 用途 |
| --- | --- |
| `armAppPrepare()` | 将现有机械臂动作接入 APP 调度 |
| `armAppReceive(data)` | 接收含 `#` 的字符串片段，缓存半条并解析 11～17 指令 |
| `armAppIsPressed(side, button)` | 判断左右 pad 上／下／左／右是否按下，只查询状态，不驱动机械臂 |
| `armAppParseAngle(text)` | 解析 0～180°角度文本，错误时返回 -1 |
| `armAppParseCoordinates(text)` | 解析三个 XYZ 数值，错误时返回空列表 |
| `armAppSelectGroup(group)` | 选择 1～3 记忆组 |
| `armAppUpdate()` | 每轮推进待执行动作；放入重复执行中 |
| `armAppStop()` | 停止待执行、回位、录制和回放，清除按键及接收缓存，保留已保存姿态 |
| `onArmAppResult(handler)` | 接收动作状态和结果，由主程序显示或发送 |

`ArmAppSide` 选择 `Left`／`Right`，`ArmAppButton` 选择 `Up`／`Down`／`Left`／`Right`。先调用 `armAppPrepare()`，再传入接收数据。单侧收到 `1100#`／`1200#` 后，该侧全部按键判断为假；同一侧同时只保持一个方向，左右两侧独立。按键状态不会因为主程序调用关节动作而被清除。

内部指令解析及 Bluetooth UART 示例见 [APP 说明](arm-app.md)。
