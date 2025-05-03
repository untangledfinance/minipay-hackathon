import { useState } from "react";
import StableTokenABI from "./cusd-abi.json";
import VaultABI from "./vault.json"
import RouterABI from "./router.json"
import BrokerABI from "./broker.json"
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
import { ethers, constants } from "ethers";
import { celo } from "viem/chains";
import { Mento, getAddress } from "@mento-protocol/mento-sdk";

const publicClient = createPublicClient({
    chain: celo,
    transport: http(),
});

const vault = '0xC5Ea7410C4B4E9a3DC240c561058a21FB7A208F2'; // mainnet
const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
const cUSD = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
const cKES = "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0";
const cREAL = "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787";

type TradeablePair = {
    id: string;
    providerAddr: string;
    assetIn: string;
    assetOut: string;
}

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
                args: [vault, constants.MaxUint256],
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

    const swap = async (fromAsset: string, toAsset: string, amount: string) => {
        let walletClient = createWalletClient({
            transport: custom(window.ethereum),
            chain: celo,
        });

        let [address] = await walletClient.getAddresses();

        const decimals = await publicClient.readContract({
            address: fromAsset as `0x${string}`,
            abi: StableTokenABI.abi,
            functionName: "decimals",
        }) as number;

        const amountIn = parseUnits(amount, decimals);

        const mento = await Mento.create(new ethers.providers.JsonRpcProvider("https://forno.celo.org"))

        const amountOutMin = Math.floor(Number(await mento.getAmountOut(
            fromAsset,
            toAsset,
            amountIn
        )) * 99 / 100);

        const tradablePair = await mento.findPairForTokens(
            fromAsset,
            toAsset
        )

        if (tradablePair.path.length === 1) {
            const broker = getAddress("Broker", celo.id)
            const allowance = await publicClient.readContract({
                address: fromAsset as `0x${string}`,
                abi: StableTokenABI.abi,
                functionName: "allowance",
                args: [address, broker],
            }) as bigint;
            if (allowance < amountIn) {
                await walletClient.writeContract({
                    address: fromAsset as `0x${string}`,
                    abi: StableTokenABI.abi,
                    functionName: "approve",
                    account: address,
                    args: [broker, constants.MaxUint256],
                });
            }

            const swapTx = await walletClient.writeContract({
                address: broker as `0x${string}`,
                abi: BrokerABI,
                functionName: "swapIn",
                account: address,
                args: [
                    tradablePair.path[0].providerAddr,
                    tradablePair.path[0].id,
                    fromAsset,
                    toAsset,
                    amountIn,
                    amountOutMin
                ]
            })
            let receipt = await publicClient.waitForTransactionReceipt({
                hash: swapTx,
            });
            return receipt;
        }

        const router = getAddress("MentoRouter", celo.id)
        const allowance = await publicClient.readContract({
            address: fromAsset as `0x${string}`,
            abi: StableTokenABI.abi,
            functionName: "allowance",
            args: [address, router],
        }) as bigint;

        if (allowance < amountIn) {
            await walletClient.writeContract({
                address: fromAsset as `0x${string}`,
                abi: StableTokenABI.abi,
                functionName: "approve",
                account: address,
                args: [router, constants.MaxUint256],
            });
        }

        const steps = await buildStep(fromAsset, toAsset);

        const swapTx = await walletClient.writeContract({
            address: router as `0x${string}`,
            abi: RouterABI,
            functionName: "swapExactTokensForTokens",
            account: address,
            args: [
                amountIn,
                amountOutMin,
                steps
            ]
        });
        const receipt = await publicClient.waitForTransactionReceipt({
            hash: swapTx,
        });

        return receipt;

    }

    async function buildStep(fromAsset: string, toAsset: string) {
        const mento = await Mento.create(new ethers.providers.JsonRpcProvider("https://forno.celo.org"))

        const tradablePair = await mento.findPairForTokens(
            fromAsset,
            toAsset
        )

        let path = [...tradablePair.path];

        if (path[0].assets.includes(toAsset)) {
            path = path.reverse()
        }

        return path.map((step, idx) => {
            const isFirstStep = idx === 0
            const isLastStep = idx === tradablePair.path.length - 1
            const prevStep = idx > 0 ? tradablePair.path[idx - 1] : null

            // For first step, ensure assetIn is tokenIn
            // For middle steps, ensure assetIn matches previous step's assetOut
            // For last step, ensure assetOut is tokenOut
            let [assetIn, assetOut] = step.assets

            if (isFirstStep && assetIn !== fromAsset) {
                ;[assetIn, assetOut] = [assetOut, assetIn]
            } else if (
                !isFirstStep &&
                !isLastStep &&
                assetIn !== prevStep!.assets[1]
            ) {
                ;[assetIn, assetOut] = [assetOut, assetIn]
            } else if (isLastStep && assetOut !== toAsset) {
                ;[assetIn, assetOut] = [assetOut, assetIn]
            }

            return {
                exchangeProvider: step.providerAddr,
                exchangeId: step.id,
                assetIn,
                assetOut,
            }
        })

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
        const decimalsOut = await publicClient.readContract({
            address: assetOut as `0x${string}`,
            abi: StableTokenABI.abi,
            functionName: "decimals",
        }) as bigint;
        const decimalsIn = await publicClient.readContract({
            address: assetIn as `0x${string}`,
            abi: StableTokenABI.abi,
            functionName: "decimals",
        }) as bigint;

        const amountInWei = parseUnits(amountIn, Number(decimalsIn));

        const mento = await Mento.create(new ethers.providers.JsonRpcProvider("https://forno.celo.org"))

        const quoteAmountOut = await mento.getAmountOut(
            assetIn,
            assetOut,
            amountInWei
        )

        return parseFloat(quoteAmountOut.toString()) / Math.pow(10, parseInt(decimalsOut.toString()));
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

    async function previewRedeem(amount: string) {
        const amountInWei = parseUnits(amount, 6);
        const receivedAmount = await publicClient.readContract({
            address: vault,
            abi: VaultABI,
            functionName: "previewRedeem",
            args: [amountInWei],
        }) as bigint;
        return parseFloat(receivedAmount.toString()) / Math.pow(10, 6);
    }

    return {
        address,
        getAssetAddress,
        getUserAddress,
        deposit,
        withdraw,
        swap,
        getAssetBalance,
        getQuote,
        previewRedeem,
    };
};
