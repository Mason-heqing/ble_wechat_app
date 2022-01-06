// pages/connectMode/connectMode.js
var util = require("../../utils/util.js");
Page({

  /**
   * 页面的初始数据
   */
  data: {
    items:[
      {value: '1', name: '企业微信', checked: 'true'},
      {value: '2', name: '业务系统'}
    ],
    
    connectWay:'1', // 连接方式：1-企业微信 2- 业务系统默认为1
    
    name:'',
    corpId:null,
    connectUrl:'http://', // 连接方式选择业务系统时，必填(http/https的链接)
    corpList:[],
    getCorpListUrl:'/attendance/api/getCorpList',
    bingCorpUrl:'/attendance/api/bingCorp',
    deviceSn:'',
    cloudLink:'',
    showCorpListBox:false
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log(options)
    const urlSplit = options.LANUrl?options.LANUrl.split(":"):[]
    const okUrl = urlSplit.length>0?((options.LANUrl&&urlSplit.length>1&&urlSplit[1]==='443')?('https://'+urlSplit[0]):('http://'+options.LANUrl)):'';
    const serverUrl = okUrl&&okUrl.indexOf('47.113.93.220')>0?'':okUrl;
    this.setData({
      deviceSn:options.deviceSn,
      LANUrl:options.LANUrl, // 选择的是局域网
      cloudLink:serverUrl||'https://attendance.ai-alloy.com'
    });
    wx.setNavigationBarTitle({
      title:'绑定企业'
    })
  },
  // 查询企业信息
  getCorpList(){
    let that = this
    that.setData({
      showCorpListBox:!that.data.showCorpListBox,
      corpList:[]
    })
    if(!that.data.showCorpListBox){return}
    wx.request({
      url:this.data.cloudLink + this.data.getCorpListUrl,
      data:{
        name:this.data.name.trim(), // 企业名称
      },
      method: 'GET',
      header: {"Content-Type": "application/json"},
      success: function(res){
        if(res.data && res.data.data && res.data.data.length > 0){
          that.setData({
            corpList:res.data.data,
            showCorpListBox:true
          })
        }
      },
      fail:function(){
        wx.showToast({
          title: '网络错误',
          icon:'none',
          duration:2000
        })
      }
    })
  },
  // 提交
  submit(){
    let that = this
    if(!this.data.name){
      this.toastNone('企业名称不能为空')
      return
    }
    //连接地址不为空，则连接业务系统
    const connectWay = this.data.connectUrl?2:0
    wx.request({
      url:this.data.cloudLink + this.data.bingCorpUrl,
      data:{
        sn:this.data.deviceSn,// 设备序列号
        name:this.data.name, //企业名称
        corpId:this.data.corpId, // 企业Id
        connectWay:connectWay, // 连接方式
        connectUrl:this.data.connectUrl // 业务系统
      },
      method: 'POST',
      header: {"Content-Type": "application/json"},
      success: function(res){
        console.log(res)
        if(res.data && res.data.code == '000000'){
          wx.redirectTo({
            url: '/pages/connectSuccess/connectSuccess?from=mode',
          })
        }else{
          res.data.msg && that.toastNone(res.data.msg);
        }
      },
      fail:function(){
        if(that.data.workWay == 2){
          that.toastNone('请填写正确的本地服务地址')
          return 
        }
        that.toastNone('网络错误')
      }
    })

  },
  // 企业名称
  nameInput(e){
    this.setData({
      name:e.detail.value
    })
  },
  // 连接地址
  urlInput(e){
    this.setData({
      connectUrl:e.detail.value
    })
  },
  // 选择企业名称
  selectName:function(e){
    let currentObj = this.data.corpList.filter((list)=>list.name === e.currentTarget.dataset.name)[0]
    const items = this.data.items
    for (let i = 0, len = items.length; i < len; ++i) {
      items[i].checked = items[i].value == currentObj.connectWay
    }
    this.setData({
      name:currentObj.name,
      corpId:currentObj.corpId,
      showCorpListBox:false,
      connectUrl:currentObj.connectUrl||'',
      items,
      connectWay:currentObj.connectWay||0
    })
  },
  toastNone(text){
    wx.showToast({
      title: text,
      icon:'none',
      duration:3000
    })
  },
  // 连接方式切换
  radioChange(e) {
    const items = this.data.items
    for (let i = 0, len = items.length; i < len; ++i) {
      items[i].checked = items[i].value === e.detail.value
    }
    this.setData({
      items,
      connectWay:e.detail.value,
      connectUrl:''
    })
  },
  // 清空企业名称
  clearName(){
    this.setData({
      name:'',
      showCorpListBox:false
    })
  }
})