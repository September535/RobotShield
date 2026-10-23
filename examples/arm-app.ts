// 蓝牙负责收发；库内部接收并解析指令，pad 动作由下面的“如果”定义。
function sendMessage (message: string) {
    serial.writeLine(message)
    bluetooth.uartWriteString(message + "#")
}

Acebott.onArmAppResult(function (message) {
    sendMessage(message)
})

bluetooth.onBluetoothConnected(function () {
    basic.showIcon(IconNames.Yes)
    basic.pause(500)
    basic.clearScreen()
    sendMessage("CONNECTED")
})

bluetooth.onBluetoothDisconnected(function () {
    // 通过协议释放按键并停止待执行动作。
    Acebott.armAppReceive("#1100#1200#1607#")
    basic.showIcon(IconNames.No)
})

bluetooth.onUartDataReceived(serial.delimiters(Delimiters.Hash), function () {
    // “读取直到 #”不包含结束符，补回 # 后直接交给接收积木。
    Acebott.armAppReceive(bluetooth.uartReadUntil(serial.delimiters(Delimiters.Hash)) + "#")
})

Acebott.armInitialize(Acebott.ArmOutputChannel.STC0, Acebott.ArmOutputChannel.STC1, Acebott.ArmOutputChannel.STC2, Acebott.ArmOutputChannel.STC3)
Acebott.armSetSpeed(Acebott.ArmSpeed.Medium)
bluetooth.startUartService()
basic.showIcon(IconNames.Heart)

basic.forever(function () {
    // 示例按原指令表改变目标角度；可自行替换这些动作。
    if (Acebott.armAppIsPressed(Acebott.ArmAppSide.Left, Acebott.ArmAppButton.Up)) {
        Acebott.armSetJoint(Acebott.ArmJoint.Shoulder, Math.constrain(Acebott.armGetJointAngle(Acebott.ArmJoint.Shoulder) - 2, 0, 180), 100)
    } else if (Acebott.armAppIsPressed(Acebott.ArmAppSide.Left, Acebott.ArmAppButton.Down)) {
        Acebott.armSetJoint(Acebott.ArmJoint.Shoulder, Math.constrain(Acebott.armGetJointAngle(Acebott.ArmJoint.Shoulder) + 2, 0, 180), 100)
    } else if (Acebott.armAppIsPressed(Acebott.ArmAppSide.Left, Acebott.ArmAppButton.Left)) {
        Acebott.armSetJoint(Acebott.ArmJoint.Chassis, Math.constrain(Acebott.armGetJointAngle(Acebott.ArmJoint.Chassis) + 2, 0, 180), 100)
    } else if (Acebott.armAppIsPressed(Acebott.ArmAppSide.Left, Acebott.ArmAppButton.Right)) {
        Acebott.armSetJoint(Acebott.ArmJoint.Chassis, Math.constrain(Acebott.armGetJointAngle(Acebott.ArmJoint.Chassis) - 2, 0, 180), 100)
    }
    if (Acebott.armAppIsPressed(Acebott.ArmAppSide.Right, Acebott.ArmAppButton.Up)) {
        Acebott.armSetJoint(Acebott.ArmJoint.Elbow, Math.constrain(Acebott.armGetJointAngle(Acebott.ArmJoint.Elbow) + 2, 0, 120), 100)
    } else if (Acebott.armAppIsPressed(Acebott.ArmAppSide.Right, Acebott.ArmAppButton.Down)) {
        Acebott.armSetJoint(Acebott.ArmJoint.Elbow, Math.constrain(Acebott.armGetJointAngle(Acebott.ArmJoint.Elbow) - 2, 0, 120), 100)
    } else if (Acebott.armAppIsPressed(Acebott.ArmAppSide.Right, Acebott.ArmAppButton.Left)) {
        Acebott.armSetJoint(Acebott.ArmJoint.Claws, Math.constrain(Acebott.armGetJointAngle(Acebott.ArmJoint.Claws) + 2, 90, 180), 100)
    } else if (Acebott.armAppIsPressed(Acebott.ArmAppSide.Right, Acebott.ArmAppButton.Right)) {
        Acebott.armSetJoint(Acebott.ArmJoint.Claws, Math.constrain(Acebott.armGetJointAngle(Acebott.ArmJoint.Claws) - 2, 90, 180), 100)
    }
    basic.pause(20)
})
