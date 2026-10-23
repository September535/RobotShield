// micro:bit V2：添加 RobotShield 和 Bluetooth 扩展后，复制到 main.ts。
// 滑块、XYZ、记忆模式由库解析；此案例不为 pad 指定动作。

bluetooth.onUartDataReceived(serial.delimiters(Delimiters.Hash), function () {
    // 读取直到 # 会去掉结束符，补回后交给库。
    Acebott.armAppReceive(bluetooth.uartReadUntil(serial.delimiters(Delimiters.Hash)) + "#")
})

Acebott.onArmAppResult(function (message) {
    // 返回执行结果及 APP 选择记忆组的确认信息。
    bluetooth.uartWriteString(message + "#")
})

bluetooth.onBluetoothDisconnected(function () {
    Acebott.armAppReceive("#1100#1200#1607#")
})

// 按接线修改，顺序为：底盘、肩部、肘部、夹爪。
Acebott.armInitialize(Acebott.ArmOutputChannel.STC0, Acebott.ArmOutputChannel.STC1, Acebott.ArmOutputChannel.STC2, Acebott.ArmOutputChannel.STC3)
Acebott.armSetSpeed(Acebott.ArmSpeed.Medium)
// 首次接收 APP 数据后自动启动后台调度，不自动回位。
bluetooth.startUartService()

