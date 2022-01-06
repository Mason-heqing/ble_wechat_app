const app = getApp();
var that;
var timeOut = null;

var sendTimeout = null;

Page({
  data: {
    //界面显示文字
    userInfo: {},
    dhcpItems: [
      { name: true, value: '启用', checked: 'true'},
      { name: false, value: '关闭' },
    ],
    netModeItems: [
      { name: 'wifi', value: 'WIFI' , checked: 'true' },
      { name: 'eth', value: '以太网' },
    ],
    // 微信通过扫描提供的蓝牙Mac地址
    mac: "c44f3322db83",

    //蓝牙通讯接收的缓存
    bleRecvBuf: "",

    //配置设备所需要的变量
    //--通讯方式
    netMode: "wifi",  
    //--wifi相关
    ssid: "",
    wifiPwdInput: "",
    wifiSSIDPlaceholder: '',
    //--以太网相关
    dhcp: true,
    ipInput: "",
    maskInput: "",
    gatewayInput: "",

    //连接蓝牙设备所需要的变量
    scanNumber: 10,

    deviceId: "",

    uuid: "",
    characteristic_read_uuid: "",
    characteristic_write_uuid: "",
    characteristic_indicate_uuid: "",

    //初始化是否成功表示
    initBleSuccess : false,
    initWifiSuccess :false,

    bleConnnectting: true,
    
    //控制UI界面所需要的变量
    showWifiFail : false,
    showWifiConfig : true,
    wifiDhcpEnable: false,
    showWifiNoDhcpConfig: false,

    showEthConfig: false,
    showEthNoDhcpConfig: false,
    ethDhcpEnable: false,

    showSetting: false,      
  },
  //事件处理函数
  onLoad: function (options) {
    console.log("onLoad");
    that = this;
    /*
        if (options.q) {
          let scan_url = decodeURIComponent(options.q);
          console.log("scan_url+:" + scan_url)
          var patt1 = /[^/\n]+$/gm;
          let mac = scan_url.match(patt1); //提取链接中mac号
          that.setData({
            mac: mac
          });
          console.log("get mac is " + mac);
          that.bleStart();
        }
    */
    that.bleStart();
    that.startWifi();
  },
  //关闭蓝牙适配器
  bleStart: function () {
    console.log("1.closeBluetoothAdapter");
    wx.closeBluetoothAdapter({
      complete: function (res) {
        that.openBluetoothAdapter();
      }
    })
  },
  //1.初始化蓝牙适配器  
  openBluetoothAdapter: function () {
    console.log("2.openBluetoothAdapter");
    wx.openBluetoothAdapter({
      success: function (res) {
        that.getBluetoothAdapterState();
      },
      fail: function (res) {
        console.log("openBluetoothAdapter fail");
        wx.showToast({
          title: '您的手机蓝牙没有打开喔',
          icon: 'none',
          duration: 3000
        })
        that.setData({ bleConnnectting :false});
      }
    })
  },
  //2.获取本机蓝牙适配器状态  
  getBluetoothAdapterState: function () {
    console.log("3.getBluetoothAdapterState");
    wx.getBluetoothAdapterState({
      success: function (res) {
        that.startBluetoothDevicesDiscovery();
      },
      fail: function (res) {
        console.log("getBluetoothAdapterState fail");
        that.setData({
          bleConnnectting: false
        });
      }
    })
  },
  // 3.开始搜寻附近的蓝牙外围设备  
  startBluetoothDevicesDiscovery: function () {
    console.log("4.startBluetoothDevicesDiscovery");
    wx.startBluetoothDevicesDiscovery({
      success: function (res) {
        setTimeout(function () {
          that.getBluetoothDevices();
        }, 1000);
      },
      fail: function (res) {
        console.log("startBluetoothDevicesDiscovery fail");
        that.setData({
          bleConnnectting: false
        });
      }
    })
  },
  //4.获取所有已发现的蓝牙设备  
  getBluetoothDevices: function () {
    console.log("5.getBluetoothDevices scan is " + that.data.scanNumber);
    if (that.data.scanNumber == 1){
      that.setData({
        bleConnnectting : false,
        scanNumber: that.data.scanNumber - 1
      });
      return;
    } else if (that.data.scanNumber == 0) {
      return;
    }
    that.setData({
      scanNumber: that.data.scanNumber - 1
    });
    wx.getBluetoothDevices({
      success: function (res) { 
        console.log(res.devices)
        if (res.devices.length != 0) {
          that.matchDeviceByMac(res.devices);
        } else {
            setTimeout(function () {
              console.log("getBluetoothDevices res.devices.length = 0");
              that.getBluetoothDevices();
            }, 1000);
        }
      },
      fail: function (res) {
        console.log("getBluetoothDevices fail");
        setTimeout(function () {
          that.getBluetoothDevices();
        }, 1000);
      }
    });
  },
  //5.匹配对应的蓝牙设备
  matchDeviceByMac: function (devices) {
    console.log("6.matchDeviceByMac");
    devices.forEach((list) => {
      if(list.advertisData){
        var mac = that.buf2hex(list.advertisData);
        console.log(that.data.mac == mac)
        if (that.data.mac == mac) {
          wx.stopBluetoothDevicesDiscovery({
            success: function success(res) { },
            fail: function fail(res) {
              console.log("stopBluetoothDevicesDiscovery fail :" + JSON.stringify(res));
            }
          });
          that.setData({
            deviceId: list.deviceId, //保存当前连接设备
            scanNumber: 0
          });
          that.createBLEConnection();
          return;
        }
      } else {
        // console.log("matchDeviceByMac catch e");
      }
    })
    setTimeout(function () {
      console.log("matchDeviceByMac not find");
      that.getBluetoothDevices();
    }, 1000);
  },
  buf2hex: function (buffer) { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
  },
  //6.连接低功耗蓝牙设备  
  createBLEConnection: function () {
    console.log("7.createBLEConnection");
    wx.createBLEConnection({
      deviceId: that.data.deviceId,
      success: function (res) {
        that.getBLEDeviceServices();
      },
      fail: function (res) {
        console.log("createBLEConnection fail");
        that.setData({
          bleConnnectting: false
        });
      }
    })
  },
  //7.获取蓝牙设备所有 service（服务）  
  getBLEDeviceServices: function () {
    console.log("8.getBLEDeviceServices");
    wx.getBLEDeviceServices({
      deviceId: that.data.deviceId,
      success: function success(res) {
        for (var i = 0; i < res.services.length; i++) {
          console.log(res.services[i].uuid.toString());
          if (res.services[i].uuid.toLowerCase().indexOf("a002") != -1) {
            that.setData({
              uuid: res.services[i].uuid
            });
          }
        }
        if (that.data.uuid != null) {
          that.getBLEDeviceCharacteristics();
        }
      }
    })
  },
  //8.获取蓝牙设备所有 characteristic（特征值）  获取notify 特征值 
  getBLEDeviceCharacteristics: function () {
    console.log("9.getBLEDeviceCharacteristics");
    wx.getBLEDeviceCharacteristics({
      deviceId: that.data.deviceId,
      serviceId: that.data.uuid,
      success: function success(res) {
        for (var i = 0; i < res.characteristics.length; i++) {
          if (res.characteristics[i].uuid.toLowerCase().indexOf("c304") != -1) {
            if (res.characteristics[i].properties.write) {
              that.setData({
                  characteristic_write_uuid: res.characteristics[i].uuid
              });
            }
          } else if (res.characteristics[i].uuid.toLowerCase().indexOf("c306") != -1) {
            if (res.characteristics[i].properties.indicate) {
              that.setData({
                  characteristic_indicate_uuid: res.characteristics[i].uuid
              })
            }
          }
        }
        that.onBLECharacteristicValueChange();
      }
    });
  },
  // 9.监听低功耗蓝牙设备的特征值变化事件 必须先启用 notifyBLECharacteristicValueChange 接口才能接收到设备推送的 notification
  onBLECharacteristicValueChange () {
    console.log("10.onBLECharacteristicValueChange");
    wx.onBLECharacteristicValueChange(function (res) {
      console.log(10,res)
      console.log(that.buf2hex(res.value))
      that.setData({bleRecvBuf: that.data.bleRecvBuf + that.buf2str(res.value).replace("\r\n", "")})
      console.log("last:" + that.data.bleRecvBuf)
      if (timeOut != null) {
        clearTimeout(timeOut);
      }
      timeOut = setTimeout(function () {
        console.log("rev time out start to handle!");
        var lBraceCount = 0;
        var rBraceCount = 0;
        if (that.data.bleRecvBuf.length > 0) {
          for (var i = 0; i < that.data.bleRecvBuf.length; i++) {
            var index = that.data.bleRecvBuf.indexOf("{", i);
            if (index == i) {
              lBraceCount++;
            }
            index = that.data.bleRecvBuf.indexOf("}", i);
            if (index == i) {
              rBraceCount++;
            }
          }
          if (lBraceCount - rBraceCount == 0) {
            console.log("inner: " + that.data.bleRecvBuf)
            var rJson = JSON.parse(that.data.bleRecvBuf);
            if (rJson.c.toString() == "dC") {
              if (rJson.r.toString() == 1) {
                wx.showToast({
                  title: '设置成功',
                  duration: 1500,
                  mask: true
                });
              }else{
                wx.showToast({
                  title: '设置失败',
                  duration: 1500,
                  mask: true
                });
              }

              var bleReset = {};
              bleReset["cmd"] = "uReset";
              console.log("reset: " + JSON.stringify(bleReset));
              var buffer = that.str2ab(JSON.stringify(bleReset));
              that.bleWrite(buffer);
            }
          }
          clearTimeout(timeOut);
          clearTimeout(sendTimeout);
          that.setData({
            bleRecvBuf:''
          })
        }
      }, 1500);
    });

    console.log("11.notifyBLECharacteristicValueChange");
    wx.notifyBLECharacteristicValueChange({
      state: true, // 启用 notify 功能
      deviceId: that.data.deviceId,
      serviceId: that.data.uuid,
      characteristicId: that.data.characteristic_indicate_uuid,
      success: function(res) {
        console.log(res)
        that.setData({
          initBleSuccess :true
        });
        wx.getSystemInfo({
          success: function(res) {
            res.system && res.system.indexOf('iOS') == -1 && that.showWifiList();
          }
        });
      },
      fail: function(res) {
        console.log("notifyBLECharacteristicValueChange fail");
        that.setData({
          bleConnnectting: false
        });
      }
    });
  },
  buf2str: function buf2str(buffer) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
  },
  //1.初始化 Wi-Fi 模块
  startWifi : function(){
    console.log("startWifi");
    wx.startWifi({
      success(res) {
        that.getWifiList();
      },fail(e){}
    });
  },
  //2.获取 Wi-Fi 列表数据
  getWifiList(){
    console.log('getWifiList')
    // ios系统不允许微信获取到wifi列表
    // 需要等这里的loading结束后再返回微信才能收到onGetWifiLists的回调，这是苹果的限制，目前没有其它办法，建议使用该功能时加个引导动画指引用户
    wx.getSystemInfo({
      success: function(res) {
        console.log(res)
        // systemInfo.model && systemInfo.model.indexOf('iPhone X') > -1 ? true : false
        if(res.system && res.system.indexOf('iOS') > -1){
          that.setData({
            wifiList: [],
            initWifiSuccess : true,
            wifiSSIDPlaceholder:'请输入网络',
            showSetting:true
          });
        }else{
          wx.getWifiList({//成功后，就可以获取列表了
            success: function(res) {
              console.log(res);
              //列表获取成功后，要到事件里提取  苹果到这里回调到手机WiFi设置去
              that.onGetWifiList()
            },
            fail: function(res) {
              console.log("getWifiList fail");
            }
          });
        }
      }
    });
    
  },
  //3.监听获取到 Wi-Fi 列表数据
  onGetWifiList : function(){
    console.log("onetWifiList");
    wx.onGetWifiList(function (res) {
      that.createWifiDeviceList(res.wifiList);
    });
  },
  createWifiDeviceList: function (wifiList) {
    console.log('createWifiDeviceList')
    console.log(wifiList)
    wifiList.sort(function (a, b) {
      return b.signalStrength - a.signalStrength
    });
    var cb = new Array();
    cb.splice(0, cb.length);
    wifiList.forEach(function (list) {
      if (list.SSID != ""){
        cb.push(list);
      }
    });
    that.setData({
      wifiList: cb,
      initWifiSuccess : true,
      wifiSSIDPlaceholder:"选择Wi-Fi"
    });
    that.showWifiList();
  },
  netConnModeChange: function (e) {
    switch (e.detail.value) {
      case 'wifi':
        this.setData({
          netMode: "wifi",
          showWifiConfig: true,
          showEthConfig: false,
          showSetting: true
        });
        break;
      case 'eth':
        this.setData({
          netMode: "eth",
          showWifiConfig: false,
          showEthConfig: true,
          showSetting: true
        });
        break;
    };
  },
  wifiDhcpChange : function(e){
    if (e.detail.value == "true"){
      this.setData({
        dhcp : true,
        showWifiNoDhcpConfig: false
      });
    } else{
      this.setData({
        dhcp: false,
        showWifiNoDhcpConfig: true
      });
    }
  },
  ethDhcpChange : function(e){
    if (e.detail.value == "true"){
      this.setData({
        dhcp : true,
        showEthNoDhcpConfig: false
      });
    } else{
      this.setData({
        dhcp: false,
        showEthNoDhcpConfig: true
      });
    }

  },
  wifiPwdInput: function wifiPwdInput(e) {
    this.setData({
      wifiPwdInput: e.detail.value
    });
  },
  ipInput: function ipInput(e) {
    this.setData({
      ipInput: e.detail.value
    });
  },
  maskInput: function maskInput(e) {
    this.setData({
      maskInput: e.detail.value
    });
  },
  gatewayInput: function gatewayInput(e) {
    this.setData({
      gatewayInput: e.detail.value
    });
  },
  wifiSsidInput: function wifiSsidInput(e){
    this.setData({
      ssid: e.detail.value
    })
  },
  wifiPwdInput: function(e){
    this.setData({
      wifiPwdInput: e.detail.value
    })
  },
  configBLE: function configBLE() {
    that.setData({bleRecvBuf:''})
    var bleConfig = {};
    bleConfig["cmd"] = "uConfig";
    if (this.data.netMode == "wifi"){
      if (this.data.ssid == '' ){
        wx.showToast({
          title: 'Wi-Fi和密码不能为空喔！',
          icon: 'none',  //success,loading,none
          duration: 2000
        })
        return;
      }
      bleConfig["Communication"] = "Wifi";
      
      bleConfig["WifiSsid"] = this.data.ssid;
      bleConfig["WifiPwd"] = this.data.wifiPwdInput;

      if(this.data.dhcp == true){
        bleConfig["DHCP"] = "true";
      }else{
        if (this.data.ipInput == '' || this.data.maskInput == '' || this.data.gatewayInput == '') {
          wx.showToast({
            title: 'IP地址、子掩码、网关IP不能为空喔！',
            icon: 'none',  //success,loading,none
            duration: 2000
          })
          return;
        }
        bleConfig["DHCP"] = "false";

        bleConfig["SrcIp"] = this.data.ipInput;
        bleConfig["Netmask"] = this.data.maskInput;
        bleConfig["Gateway"] = this.data.gatewayInput;
      }

    } else if (this.data.netMode == "eth"){
      bleConfig["Communication"] = "Ethernet";

      if (this.data.dhcp == true){
        bleConfig["DHCP"] = "true";
      }else{
        if (this.data.ipInput == '' || this.data.maskInput == '' || this.data.gatewayInput == '') {
          wx.showToast({
            title: 'IP地址、子掩码、网关IP不能为空喔！',
            icon: 'none',  //success,loading,none
            duration: 2000
          })
          return;
        }
        bleConfig["DHCP"] = "false";

        bleConfig["SrcIp"] = this.data.ipInput;
        bleConfig["Netmask"] = this.data.maskInput;
        bleConfig["Gateway"] = this.data.gatewayInput;
      }
    }else{
      return;
    }

    console.log("config: " + JSON.stringify(bleConfig));

    var buffer = that.str2ab(JSON.stringify(bleConfig));
    that.bleWrite(buffer);

    wx.showLoading({
      title: '配置中...',
    });

    sendTimeout = setTimeout(function () { 
      wx.showToast({
        title: '配置超时！',
        icon: 'none',
        duration: 2000
      });
    }, 5000);

  },
  str2ab: function str2ab(str) {
    var buf = new ArrayBuffer(str.length); // 2 bytes for each char
    var bufView = new Uint8Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  },
  //发送报文给设备
  bleWrite: function bleWrite(buf) {
    console.log("write buf:" + String.fromCharCode.apply(null, new Uint8Array(buf)));
    wx.writeBLECharacteristicValue({
      deviceId: that.data.deviceId,
      serviceId: that.data.uuid,
      characteristicId: that.data.characteristic_write_uuid,
      value: buf,
      success: function success(res) { },
      fail: function fail(res) {
        console.log("sendData writeBLECharacteristicValue1 fail: " + JSON.stringify(res));
      }
    });
  },
  selecttWifiBtn: function (even) {
    that.setData({
      ssid: even.detail.currentTarget.dataset.id || '', //保存当前连接设备
      showWifiConfig: true,
      showSetting: true
    });
  },
  flushWifiBtn : function(even){
    console.log(even);
    that.setData({
      wifiList : {}
    });
    that.startWifi();
  },
  showWifiList() {
    if(that.data.initBleSuccess && that.data.initWifiSuccess){
      var wifiComponent = this.selectComponent("#wifi-ref");
      wifiComponent.showModel();
    }
  },
  onUnload: function(){
    console.log("onUnload");
    wx.closeBLEConnection({
      deviceId : that.data.deviceId,
      success(res) {
        console.log(res)
      }
    });

    wx.closeBluetoothAdapter({
      complete: function (res) {
      }
    });
  }
})