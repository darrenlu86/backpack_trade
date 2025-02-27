"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const backpack_client_1 = require("./backpack_client");

function delay(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function randomBreak() {
    // 定义5到10分钟的随机延迟时间
    const minutes = Math.random() * 5 + 5;
    const delayTime = minutes * 60 * 1000; // 将分钟转换为毫秒
    console.log(`${getNowFormatDate()}，即将休息${minutes.toFixed(2)}分钟...`);
    return delay(delayTime); // 使用之前定义的`delay`函数进行延迟
}

function getNowFormatDate() {
    var date = new Date();
    var seperator1 = "-";
    var seperator2 = ":";
    var month = date.getMonth() + 1;
    var strDate = date.getDate();
    var strHour = date.getHours();
    var strMinute = date.getMinutes();
    var strSecond = date.getSeconds();
    if (month >= 1 && month <= 9) {
        month = "0" + month;
    }
    if (strDate >= 0 && strDate <= 9) {
        strDate = "0" + strDate;
    }
    if (strHour >= 0 && strHour <= 9) {
        strHour = "0" + strHour;
    }
    if (strMinute >= 0 && strMinute <= 9) {
        strMinute = "0" + strMinute;
    }
    if (strSecond >= 0 && strSecond <= 9) {
        strSecond = "0" + strSecond;
    }
    var currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate
        + " " + strHour + seperator2 + strMinute
        + seperator2 + strSecond;
    return currentdate;
}

let successbuy = 0;
let sellbuy = 0;
let operationCount = 0;


const init = async (client, symbol) => {
    try {
        operationCount++;
        const randomDelay = Math.random() * 18000 + 5000;// 5到23秒的随机延迟
        console.log(`成功买入次数:${successbuy},成功卖出次数:${sellbuy}`);
        console.log(getNowFormatDate(), "等待"+randomDelay+"秒...");
        await delay(randomDelay);
        // 每约30分钟（根据操作次数和延迟时间估算）进行一次长时间随机休息
        if (operationCount >= 60) { // 假设平均每次操作耗时30秒，则60次大约30分钟
            await randomBreak(); // 执行随机休息
            operationCount = 0; // 重置计数器
        }
        console.log(getNowFormatDate(), "正在获取账户信息中...");
        let userbalance = await client.Balance();
        if (userbalance.USDC.available > 5) {
            await buyfun(client, symbol);
        } else {
            await sellfun(client, symbol);
            return;
        }
    } catch (e) {
        init(client, symbol);
        console.log(getNowFormatDate(), "挂单失败，重新挂单中...");
        await delay(1000);
    }
}

const sellfun = async (client, symbol) => {
    let GetOpenOrders = await client.GetOpenOrders({ symbol });
    if (GetOpenOrders.length > 0) {
        let CancelOpenOrders = await client.CancelOpenOrders({ symbol });
        console.log(getNowFormatDate(), "取消了所有挂单");
    } else {
        console.log(getNowFormatDate(), "账号订单正常，无需取消挂单");
    }
    console.log(getNowFormatDate(), "正在获取账户信息中...");
    let userbalance2 = await client.Balance();
    console.log(getNowFormatDate(), "账户信息:", userbalance2);
    let { lastPrice: lastPriceask } = await client.Ticker({ symbol });
    console.log(getNowFormatDate(), `${symbol}的市场当前价格:`, lastPriceask);
    let asset = symbol.split('_')[0]; // 获取资产标识，例如"SOL"从"SOL_USDC"
    let quantitys = ((userbalance2[asset].available / 2) - 0.02).toFixed(2).toString();
    console.log(getNowFormatDate(), `正在卖出中... 卖${quantitys}个${asset}`);
    let orderResultAsk = await client.ExecuteOrder({
        orderType: "Limit",
        price: lastPriceask.toString(),
        quantity: quantitys,
        side: "Ask", //卖
        symbol,
        timeInForce: "IOC"
    })

    if (orderResultAsk?.status == "Filled" && orderResultAsk?.side == "Ask") {
        console.log(getNowFormatDate(), "卖出成功");
        sellbuy += 1;
        console.log(getNowFormatDate(), "订单详情:", `卖出价格:${orderResultAsk.price}, 卖出数量:${orderResultAsk.quantity}, 订单号:${orderResultAsk.id}`);
        init(client, symbol);
    } else {
        console.log(getNowFormatDate(), "卖出失败");
        throw new Error("卖出失败");
    }
}

const buyfun = async (client, symbol) => {
    let GetOpenOrders = await client.GetOpenOrders({ symbol });
    if (GetOpenOrders.length > 0) {
        let CancelOpenOrders = await client.CancelOpenOrders({ symbol });
        console.log(getNowFormatDate(), "取消了所有挂单");
    } else {
        console.log(getNowFormatDate(), "账号订单正常，无需取消挂单");
    }
    console.log(getNowFormatDate(), "正在获取账户信息中...");
    let userbalance = await client.Balance();
    console.log(getNowFormatDate(), "账户信息:", userbalance);
    let { lastPrice } = await client.Ticker({ symbol });
    console.log(getNowFormatDate(), `${symbol}的市场当前价格:`, lastPrice);
    let quantitys = ((userbalance.USDC.available - 2) / lastPrice).toFixed(2).toString();
    let asset = symbol.split('_')[0]; // 用于日志消息中
    console.log(getNowFormatDate(), `正在买入中... 花${(userbalance.USDC.available - 2).toFixed(2).toString()}个USDC买${asset}`);
    let orderResultBid = await client.ExecuteOrder({
        orderType: "Limit",
        price: lastPrice.toString(),
        quantity: quantitys,
        side: "Bid", //买
        symbol,
        timeInForce: "IOC"
    })
    if (orderResultBid?.status == "Filled" && orderResultBid?.side == "Bid") {
        console.log(getNowFormatDate(), "下单成功");
        successbuy += 1;
        console.log(getNowFormatDate(), "订单详情:", `购买价格:${orderResultBid.price}, 购买数量:${orderResultBid.quantity}, 订单号:${orderResultBid.id}`);
        init(client, symbol);
    } else {
        console.log(getNowFormatDate(), "下单失败");
        throw new Error("买入失败");
    }
}

(async () => {
    const apisecret = "";
    const apikey = "";
    const client = new backpack_client_1.BackpackClient(apisecret, apikey);
    const tradingPair = "SOL_USDC"; // 可以改成你想要的交易對，例如 "MOBILE_USDC"
    init(client, tradingPair);
})()
