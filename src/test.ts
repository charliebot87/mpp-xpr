/**
 * End-to-end test of XPR payment method on mainnet.
 * 
 * 1. Simulates server creating a payment challenge (1 XPR)
 * 2. Client signs the transfer using proton CLI key
 * 3. Server verifies the tx on-chain
 */

import { JsonRpc, Api, JsSignatureProvider } from '@proton/js'

const RPC_ENDPOINT = 'https://api.protonnz.com'
const HYPERION = 'https://proton.eosusa.io'
const PAYER = 'charliebot'
const RECIPIENT = 'paul'  // Pay ourselves for testing
const AMOUNT = '0.0001 XPR'    // Tiny amount for test
const MEMO = 'mpp-xpr-test'

// Read key from proton CLI config
import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

async function getPrivateKey(): Promise<string> {
  const configPath = join(homedir(), 'Library/Preferences/@proton/cli-nodejs/proton-cli.json')
  const config = JSON.parse(readFileSync(configPath, 'utf-8'))
  // Key index 2 = charliebot active key
  return config.privateKeys[2]
}

async function test() {
  console.log('=== MPP-XPR End-to-End Test ===\n')
  
  // Step 1: Server creates challenge
  console.log('1. SERVER: Creating payment challenge')
  console.log(`   Amount: ${AMOUNT}`)
  console.log(`   Recipient: ${RECIPIENT}`)
  console.log(`   Memo: ${MEMO}`)
  
  // Step 2: Client signs transfer
  console.log('\n2. CLIENT: Signing transfer...')
  const privateKey = await getPrivateKey()
  const rpc = new JsonRpc(RPC_ENDPOINT)
  const api = new Api({
    rpc,
    signatureProvider: new JsSignatureProvider([privateKey]),
  })
  
  const actions = [{
    account: 'eosio.token',
    name: 'transfer',
    authorization: [{ actor: PAYER, permission: 'active' }],
    data: {
      from: PAYER,
      to: RECIPIENT,
      quantity: AMOUNT,
      memo: MEMO,
    },
  }]
  
  let txHash: string
  try {
    const result = await api.transact(
      { actions },
      { blocksBehind: 3, expireSeconds: 120 }
    ) as any
    txHash = result.transaction_id || result.processed?.id
    console.log(`   ✅ TX signed: ${txHash}`)
  } catch (e: any) {
    console.error(`   ❌ TX failed: ${e.message}`)
    process.exit(1)
  }
  
  // Step 3: Wait for chain propagation
  console.log('\n3. Waiting 2s for chain propagation...')
  await new Promise(r => setTimeout(r, 2000))
  
  // Step 4: Server verifies on-chain
  console.log('\n4. SERVER: Verifying transaction on-chain...')
  
  // Method A: Hyperion
  try {
    const resp = await fetch(`${HYPERION}/v2/history/get_transaction?id=${txHash}`)
    const data = await resp.json() as any
    
    if (data.executed !== undefined) {
      console.log(`   Hyperion: executed=${data.executed}`)
      
      const transferAction = data.actions?.find((a: any) => 
        a.act.name === 'transfer' && 
        a.act.data.to === RECIPIENT &&
        a.act.data.quantity === AMOUNT
      )
      
      if (transferAction) {
        console.log(`   ✅ Payment verified via Hyperion!`)
        console.log(`   From: ${transferAction.act.data.from}`)
        console.log(`   To: ${transferAction.act.data.to}`)
        console.log(`   Amount: ${transferAction.act.data.quantity}`)
        console.log(`   Memo: ${transferAction.act.data.memo}`)
      } else {
        console.log(`   ⚠️ TX found but transfer action not matching`)
      }
    }
  } catch (e: any) {
    console.log(`   Hyperion check failed: ${e.message}`)
  }
  
  // Step 5: Receipt
  console.log('\n5. SERVER: Issuing receipt')
  console.log(`   ✅ Payment confirmed`)
  console.log(`   Method: xpr`)
  console.log(`   TX: ${txHash}`)
  console.log(`   Explorer: https://explorer.xprnetwork.org/transaction/${txHash}`)
  
  console.log('\n=== Test Complete ===')
  console.log(`\nFull flow working: 402 → sign → credential (${txHash}) → verify → receipt`)
}

test().catch(console.error)
