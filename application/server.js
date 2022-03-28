// 1. 모듈포함
// 1.1 객체 생성 
const express = require('express');
const app = express();
var bodyParser = require('body-parser');

const FabricCAServices = require('fabric-ca-client'); 
const { FileSystemWallet, Gateway, X509WalletMixin } = require('fabric-network');

const fs = require('fs');
const path = require('path');

// 2. 서버설정
// 2.1 패브릭 연결설정
const ccpPath = path.resolve(__dirname, 'connection.json'); // /home/bstudent/dev/first-project/application/connection.json
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON); // unmarshal? []byte -> 구조체 객체화~

// 2.2 서버 속성 설정
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.static(path.join(__dirname, 'views')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// 3. HTML 라우팅
// 3.1 index.html
app.get('/', (request, response)=>{  // callback 함수 
    response.sendFile(__dirname + '/index.html');
})
// 3.2 create.html
app.get('/create', (request, response)=>{  // callback 함수 
    response.sendFile(__dirname + '/views/create.html');
})
// 3.3 query.html
app.get('/query', (request, response)=>{  // callback 함수 
    response.sendFile(__dirname + '/views/query.html');
})
// 4. REST api 라우팅

app.post('/suser', async(request, response)=>{
    const mode = request.body.mode;

    if(mode == 1) // 관리자 인증서 
    {
        const id = request.body.id;
        const pw = request.body.pw;

        try {

            // Create a new CA client for interacting with the CA.
            const caURL = ccp.certificateAuthorities['ca.example.com'].url;
            const ca = new FabricCAServices(caURL);
    
            // Create a new file system based wallet for managing identities.
            const walletPath = path.join(process.cwd(), 'wallet');
            const wallet = new FileSystemWallet(walletPath);
            console.log(`Wallet path: ${walletPath}`);
    // {
    //     "CODE":...,
    //     "ERR_MSG:...,
    //     "PAYLOAD":..."
    // }
            // Check to see if we've already enrolled the admin user.
            const adminExists = await wallet.exists('admin');
            if (adminExists) {
                console.log('An identity for the admin user admin already exists in the wallet');
                // 오류전송 to 클라이언트
                const obj = JSON.parse('{"ERR_MSG":"An identity for the admin user admin already exists in the wallet"}');
                response.status(400).json(obj);
            }
    
            // Enroll the admin user, and import the new identity into the wallet.
            const enrollment = await ca.enroll({ enrollmentID: id, enrollmentSecret: pw });
            const identity = X509WalletMixin.createIdentity('Org1MSP', enrollment.certificate, enrollment.key.toBytes());
            wallet.import('admin', identity);
            console.log('Successfully enrolled admin user admin and imported it into the wallet');
            const obj = JSON.parse('{"PAYLOAD":"Successfully enrolled admin user admin and imported it into the wallet"}');
            response.status(200).json(obj);
    
        } catch (error) {
            console.error(`Failed to enroll admin user admin: ${error}`);
            // process.exit(1);
            // 오류전송 to 클라이언트
            const obj = JSON.parse(`{"ERR_MSG":"Failed to enroll admin user admin : ${error}"}`);
            response.status(400).json(obj);
        }

    }
    else if(mode == 2) // 사용자 인증서 
    {
        const id = request.body.id;
        const role = request.body.role;
        try {

            // Create a new file system based wallet for managing identities.
            const walletPath = path.join(process.cwd(), 'wallet');
            const wallet = new FileSystemWallet(walletPath);
            console.log(`Wallet path: ${walletPath}`);
    
            // Check to see if we've already enrolled the user.
            const userExists = await wallet.exists(id);
            if (userExists) {
                console.log('An identity for the user "user1" already exists in the wallet');
                const obj = JSON.parse('{"ERR_MSG":"An identity for the user "user1" already exists in the wallet"}');
                response.status(400).json(obj);
            }
    
            // Check to see if we've already enrolled the admin user.
            const adminExists = await wallet.exists('admin');
            if (!adminExists) {
                console.log('An identity for the admin user admin does not exist in the wallet');
                console.log('Run the enrollAdmin.js application before retrying');
                const obj = JSON.parse('{"ERR_MSG":"An identity for the admin user admin does not exist in the wallet"}');
                response.status(400).json(obj);
            }
    
            // Create a new gateway for connecting to our peer node.
            const gateway = new Gateway();
            await gateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: false } });
    
            // Get the CA client object from the gateway for interacting with the CA.
            const ca = gateway.getClient().getCertificateAuthority();
            const adminIdentity = gateway.getCurrentIdentity();
    
            // Register the user, enroll the user, and import the new identity into the wallet.
            const secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: 'user1', role: 'client' }, adminIdentity);
            const enrollment = await ca.enroll({ enrollmentID: 'user1', enrollmentSecret: secret });
            const userIdentity = X509WalletMixin.createIdentity('Org1MSP', enrollment.certificate, enrollment.key.toBytes());
            wallet.import('user1', userIdentity);
            console.log('Successfully registered and enrolled admin user "user1" and imported it into the wallet');
            const obj = JSON.parse('{"PAYLOAD":"Successfully registered and enrolled admin user "user1" and imported it into the wallet"}');
            response.status(200).json(obj);
    
        } catch (error) {
            console.error(`Failed to register user "user1": ${error}`);
            const obj = JSON.parse(`{"ERR_MSG":"Failed to register user "user1": ${error}"}`);
            response.status(400).json(obj);
        }
    }
})

// 4.1 /asset POST
app.post('/asset', async(request, response)=>{
    // 어플리케이션 요청문서에서 파라미터 꺼내기 ( POST method에서는 body에서 꺼냄 )
    const id    = request.body.id;
    const key   = request.body.key;
    const value = request.body.value;
    console.log('/asset-post-'+key+'-'+value);
    // 인증서작업 -> user1
    const walletPath = path.join(process.cwd(), 'wallet') // ~/dev/first-project/application/wallet
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);
    const userExists = await wallet.exists(id);
    if(!userExists) {
        console.log('An identity for the user ${id} does nto exist in the wallet');
        console.log('Run the registerUser.js application before retrying');
        // 클라이언트에서 인증서에 관한 안내 HTML을 보내줘야 함
        response.status(401).sendFile(__dirname + '/unauth.html');
        return;
    }
    // 게이트웨이연결
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: id, discovery: { enabled: false } });
    // 채널 연결
    const network = await gateway.getNetwork('mychannel');
    // 체인코드 연결
    const contract = network.getContract('simpleasset');
    // 트랜젝션처리
    await contract.submitTransaction('set', key, value);
    console.log('Transaction has been submitted');
    // 게이트웨이연결 해제
    await gateway.disconnect();
    // 결과 클라이언트에 전송
    // result.html수정 
    const resultPath = path.join(process.cwd(), '/views/result.html')
    var resultHTML = fs.readFileSync(resultPath, 'utf8');
    resultHTML = resultHTML.replace("<div></div>", "<div><p>Transaction has been submitted</p></div>");
    response.status(200).send(resultHTML);
})
// 4.2 /asset GET
app.get('/asset', async(request, response)=>{
    // 어플리케이션 요청문서에서 파라미터 꺼내기 ( POST method에서는 query에서 꺼냄 )
    const key   = request.query.key;
    const id   = request.query.id;

    console.log('/asset-get-'+key);
    // 인증서작업 -> user1
    const walletPath = path.join(process.cwd(), 'wallet') // ~/dev/first-project/application/wallet
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);
    const userExists = await wallet.exists(id);
    if(!userExists) {
        console.log('An identity for the user ${id} does nto exist in the wallet');
        console.log('Run the registerUser.js application before retrying');
        // 클라이언트에서 인증서에 관한 안내 HTML을 보내줘야 함
        const obj = JSON.parse()
        response.status(401).sendFile(__dirname + '/unauth.html');
        return;
    }
    // 게이트웨이연결
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: id, discovery: { enabled: false } });
    // 채널 연결
    const network = await gateway.getNetwork('mychannel');
    // 체인코드 연결
    const contract = network.getContract('simpleasset');
    // 트랜젝션처리
    const txresult = await contract.evaluateTransaction('get', key);
    console.log('Transaction has been evaluated: '+txresult);
    // 게이트웨이연결 해제
    await gateway.disconnect();
    // 결과 클라이언트에 전송
    // result.html수정 
    // const resultPath = path.join(process.cwd(), '/views/result.html')
    // var resultHTML = fs.readFileSync(resultPath, 'utf8');
    // resultHTML = resultHTML.replace("<div></div>", `<div><p>Transaction has been evaluated: ${txresult}</p></div>`);
    // response.status(200).send(resultHTML);
    const obj = JSON.parse(txresult);
    response.status(200).json(obj);
})

// 4.3 /assets GET
app.get('/assets', async(request, response)=>{
    // 어플리케이션 요청문서에서 파라미터 꺼내기 ( POST method에서는 query에서 꺼냄 )
    const key   = request.query.key;

    console.log('/assets-get-'+key);
    // 인증서작업 -> user1
    const walletPath = path.join(process.cwd(), 'wallet') // ~/dev/first-project/application/wallet
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);
    const userExists = await wallet.exists(id);
    if(!userExists) {
        console.log('An identity for the user ${id} does nto exist in the wallet');
        console.log('Run the registerUser.js application before retrying');
        // 클라이언트에서 인증서에 관한 안내 HTML을 보내줘야 함
        response.status(401).sendFile(__dirname + '/unauth.html');
        return;
    }
    // 게이트웨이연결
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: id, discovery: { enabled: false } });
    // 채널 연결
    const network = await gateway.getNetwork('mychannel');
    // 체인코드 연결
    const contract = network.getContract('simpleasset');
    // 트랜젝션처리
    const txresult = await contract.evaluateTransaction('history', key);
    console.log('Transaction has been evaluated: '+txresult);
    // 게이트웨이연결 해제
    await gateway.disconnect();
    // 결과 클라이언트에 전송
    // result.html수정 
    const resultPath = path.join(process.cwd(), '/views/result.html')
    var resultHTML = fs.readFileSync(resultPath, 'utf8');

    var tableHTML="";
    const txs = JSON.parse(txresult);
    for(var i=1 ; i<txs.length; 1++)
    {
        tableHTML+="<tr>";
        tableHTML+="<td>TxID</td>";
        tableHTML+=tableHTML+"<td>"+txs[i].TxID+"</td>";
        tableHTML+="<td>Timestamp</td>";
        tableHTML+=tableHTML+"<td>"+txs[i].Timestamp+"</td>";
        tableHTML+="</tr>";
    }
    tableHTML="</table>"


    resultHTML = resultHTML.replace("<div></div>", `<div><p>Transaction has been evaluated: ${txresult}</p></div>`);
    response.status(200).send(resultHTML);
    // const obj = JSON.parse(txresult);
    // response.status(200).json(obj);
})
// 4.4 /asset POST
app.post('/tx', async(request, response)=>{
    // 어플리케이션 요청문서에서 파라미터 꺼내기 ( POST method에서는 body에서 꺼냄 )
    const id    = request.body.id;
    const from   = request.body.from;
    const to   = request.body.to;
    const value = request.body.value;
    console.log('/asset-post-'+key+'-'+value);
    // 인증서작업 -> user1
    const walletPath = path.join(process.cwd(), 'wallet') // ~/dev/first-project/application/wallet
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);
    const userExists = await wallet.exists(id);
    if(!userExists) {
        console.log('An identity for the user "user1" does nto exist in the wallet');
        console.log('Run the registerUser.js application before retrying');
        // 클라이언트에서 인증서에 관한 안내 HTML을 보내줘야 함
        response.status(401).sendFile(__dirname + '/unauth.html');
        return;
    }
    // 게이트웨이연결
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: id, discovery: { enabled: false } });
    // 채널 연결
    const network = await gateway.getNetwork('mychannel');
    // 체인코드 연결
    const contract = network.getContract('simpleasset');
    // 트랜젝션처리
    await contract.submitTransaction('tansfer', from, to, value);
    console.log('Transaction has been submitted');
    // 게이트웨이연결 해제
    await gateway.disconnect();
    // 결과 클라이언트에 전송
    // result.html수정 
    const resultPath = path.join(process.cwd(), '/views/result.html')
    var resultHTML = fs.readFileSync(resultPath, 'utf8');
    resultHTML = resultHTML.replace("<div></div>", "<div><p>Transaction has been submitted</p></div>");
    response.status(200).send(resultHTML);
})

// 5. 서버시작
app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);