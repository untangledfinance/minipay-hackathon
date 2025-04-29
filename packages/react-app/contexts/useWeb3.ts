import { useState } from "react";
import StableTokenABI from "./cusd-abi.json";
import VaultABI from "./vault.json"
import {
    createPublicClient,
    createWalletClient,
    custom,
    getContract,
    http,
    parseEther,
    parseUnits,
    stringToHex,
    encodeFunctionData,
} from "viem";
import { ethers } from "ethers";
import { celo } from "viem/chains";
import { Mento, getAddress } from "@mento-protocol/mento-sdk";

const publicClient = createPublicClient({
    chain: celo,
    transport: http(),
});

const vault = '0x06Df9594f4717D54C1c37f3D6a6c5B370Fbb5f6d'; // mainnet
const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
const cUSD = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
const cKES = "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0";
const cREAL = "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787";

export const useWeb3 = () => {
    const [address, setAddress] = useState<string | null>(null);

    const getUserAddress = async () => {
        if (typeof window !== "undefined" && window.ethereum) {
            let walletClient = createWalletClient({
                transport: custom(window.ethereum),
                chain: celo,
            });

            let [address] = await walletClient.getAddresses();
            setAddress(address);
        }
    };


    const deposit = async (amount: string) => {
        let walletClient = createWalletClient({
            transport: custom(window.ethereum),
            chain: celo,
        });

        let [address] = await walletClient.getAddresses();

        const amountInWei = parseUnits(amount, 6);
        console.log(amountInWei.toString())

        const allowance = await publicClient.readContract({
            address: USDC,
            abi: StableTokenABI.abi,
            functionName: "allowance",
            args: [address, vault],
        }) as bigint;

        if (allowance < amountInWei) {
            const approveTx = await walletClient.writeContract({
                address: USDC,
                abi: StableTokenABI.abi,
                functionName: "approve",
                account: address,
                args: [vault, amountInWei],
            });

            await publicClient.waitForTransactionReceipt({
                hash: approveTx,
            });
        }

        const depositTx = await walletClient.writeContract({
            address: vault,
            abi: VaultABI,
            functionName: "deposit",
            account: address,
            args: [amountInWei, address],
        });



        let receipt = await publicClient.waitForTransactionReceipt({
            hash: depositTx,
        });

        return receipt;
    }

    const withdraw = async (amount: string) => {
        let walletClient = createWalletClient({
            transport: custom(window.ethereum),
            chain: celo,
        });

        let [address] = await walletClient.getAddresses();

        const amountInWei = parseUnits(amount, 6);

        const tx = await walletClient.writeContract({
            address: vault,
            abi: VaultABI,
            functionName: "withdraw",
            account: address,
            args: [amountInWei, address, address],
        });

        let receipt = await publicClient.waitForTransactionReceipt({
            hash: tx,
        });

        return receipt;
    }

    const swap = async (assetIn: string, assetOut: string, amount: string) => {
        let walletClient = createWalletClient({
            transport: custom(window.ethereum),
            chain: celo,
        });

        let [address] = await walletClient.getAddresses();

        const decimals = await publicClient.readContract({
            address: assetIn as `0x${string}`,
            abi: StableTokenABI.abi,
            functionName: "decimals",
        }) as number;

        const amountIn = parseUnits(amount, decimals);

        const mento = await Mento.create(new ethers.providers.JsonRpcProvider(celo.rpcUrls.default.http[0]))

        const quoteAmountOut = await mento.getAmountOut(
            assetIn,
            assetOut,
            amountIn
        )

        const tradablePair = await mento.findPairForTokens(
            assetIn,
            assetOut
        )

        // const router = getAddress("MentoRouter", celo.id)
        // const allowance = await publicClient.readContract({
        //     address: USDC,
        //     abi: StableTokenABI.abi,
        //     functionName: "allowance",
        //     args: [address, router],
        // }) as bigint;

        // if (allowance < amountIn) {
        //     await walletClient.writeContract({
        //         address: USDC,
        //         abi: StableTokenABI.abi,
        //         functionName: "approve",
        //         account: address,
        //         args: [router, amountIn],
        //     });
        // }

        console.log(quoteAmountOut.toString())
        const expectedAmoutOut = quoteAmountOut;
        const swapTx = await mento.swapIn(
            assetIn,
            assetOut,
            amountIn,
            expectedAmoutOut,
            tradablePair
        );

        console.log(swapTx);


        // await walletClient.sendTransaction({
        //     to: allowanceTx.to as `0x${string}`,
        //     data: allowanceTx.data as `0x${string}`,
        //     value: allowanceTx.value as bigint,
        //     account: address
        // })

        // const expectedAmoutOut = quoteAmountOut.mul(99).div(100);
        // const swapTx = await mento.swapIn(
        //     cUSD,
        //     USDC,
        //     amountIn,
        //     expectedAmoutOut
        // );

        // await walletClient.sendTransaction({
        //     to: swapTx.to as `0x${string}`,
        //     data: swapTx.data as `0x${string}`,
        //     value: swapTx.value as bigint,
        //     account: address
        // })
    }

    async function getAssetBalance(asset: string) {

        const decimals = await publicClient.readContract({
            address: asset as `0x${string}`,
            abi: StableTokenABI.abi,
            functionName: "decimals",
        }) as bigint;

        const balance = await publicClient.readContract({
            address: asset as `0x${string}`,
            abi: StableTokenABI.abi,
            functionName: "balanceOf",
            args: [address],
        }) as bigint;

        const balanceInUnits = parseFloat(balance.toString()) / Math.pow(10, parseInt(decimals.toString()));
        return balanceInUnits;

    }


    async function getQuote(assetIn: string, assetOut: string, amountIn: string) {
        const decimals = await publicClient.readContract({
            address: assetOut as `0x${string}`,
            abi: StableTokenABI.abi,
            functionName: "decimals",
        }) as bigint;

        const amountInWei = parseUnits(amountIn, 6);

        const mento = await Mento.create(new ethers.providers.JsonRpcProvider(celo.rpcUrls.default.http[0]))

        const quoteAmountOut = await mento.getAmountOut(
            assetIn,
            assetOut,
            amountInWei
        )

        return parseFloat(quoteAmountOut.toString()) / Math.pow(10, parseInt(decimals.toString()));
    }

    function getAssetAddress(asset: string) {
        switch (asset) {
            case "USDC":
                asset = USDC;
                break;
            case "cUSD":
                asset = cUSD;
                break;
            case "cKES":
                asset = cKES;
                break;
            case "cREAL":
                asset = cREAL;
                break;
            case "share":
                asset = vault;
                break;
            default:
                asset = USDC;
                break;
        }

        return asset as `0x${string}`
    }

    return {
        address,
        getAssetAddress,
        getUserAddress,
        deposit,
        withdraw,
        swap,
        getAssetBalance,
        getQuote
    };
};
