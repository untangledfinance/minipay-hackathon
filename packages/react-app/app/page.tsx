"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useWeb3 } from "@/contexts/useWeb3";
import { get } from "http";
import Image from "next/image";
import { use, useEffect, useState } from "react";

export default function Home() {
  const {
    address,
    getUserAddress,
    deposit,
    withdraw,
    swap,
    getAssetBalance,
    getAssetAddress,
    getQuote,
    previewRedeem,
  } = useWeb3();

  const [asset, setAsset] = useState<string>("USDC");
  const [toAsset, setToAsset] = useState<string>("USDC");
  const [savingBalance, setSavingBalance] = useState<number>(0);

  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [depositQuote, setDepositQuote] = useState<number>(0);
  const [withdrawQuote, setWithdrawQuote] = useState<number>(0);
  const [swapQuote, setSwapQuote] = useState<number>(0);
  const [step, setStep] = useState<number>(0);

  const [depositAmount, setDepositAmount] = useState<string>("0.1"); // State to track the amount to send
  const [withdrawAmount, setWithdrawAmount] = useState<string>("0.1"); // State to track the amount to send
  const [swapAmount, setSwapAmount] = useState<string>("0.1"); // State to track the amount to send
  const [tx, setTx] = useState<any>(undefined);
  const [amount, setAmount] = useState<string>("0.1"); // State to track the amount to send
  const [assets, setAssets] = useState<any>([
    {
      name: "cUSD",
      address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
      balance: 0,
      icon: "/cUSD.svg",
    },
    {
      name: "cKES",
      address: "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0",
      balance: 0,
      icon: "/cKES.svg",
    },
    {
      name: "cREAL",
      address: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
      balance: 0,
      icon: "/cREAL.svg",
    },
    {
      name: "USDC",
      address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
      balance: 0,
      icon: "/USDC.svg",
    },
  ]);

  const vaultAddress = "0xC5Ea7410C4B4E9a3DC240c561058a21FB7A208F2";
  useEffect(() => {
    getUserAddress();
  }, []);

  useEffect(() => {
    const asset0 = getAssetAddress(asset);
    const asset1 = getAssetAddress(toAsset);
    const getData = async () => {
      try {
        const quote = await getQuote(asset0, asset1, swapAmount);
        setSwapQuote(quote);
      } catch (error) {
        console.error("Error fetching swap quote:", error);
      }
    };
    if (asset != toAsset) {
      getData();
    } else {
      setSwapQuote(Number(swapAmount));
    }
  }, [asset]);

  useEffect(() => {
    const getData = async () => {
      const asset0 = getAssetAddress(asset);
      const asset1 = getAssetAddress(toAsset);
      const quote = await getQuote(asset0, asset1, swapAmount);
      setSwapQuote(quote);
    };
    if (asset != toAsset) {
      getData();
    } else {
      setSwapQuote(Number(swapAmount));
    }
  }, [toAsset]);

  useEffect(() => {
    const getData = async () => {
      const asset0 = getAssetAddress(asset);
      const asset1 = getAssetAddress(toAsset);
      const quote = await getQuote(asset0, asset1, swapAmount);
      setSwapQuote(quote);
    };
    if (asset != toAsset) {
      getData();
    }
  }, [swapAmount]);

  useEffect(() => {
    const getData = async () => {
      const balance = await getAssetBalance(vaultAddress);
      console.log("saving balance: ", balance);
      setSavingBalance(balance);
    };
    if (address) {
      getData();
    }
  }, [address]);

  useEffect(() => {
    const getData = async () => {
      try {
        const assetsBalance = await Promise.all(
          assets.map(async (a: any) => {
            const balance = await getAssetBalance(a.address);
            return {
              ...a,
              balance: balance,
            };
          })
        );
        setAssets(assetsBalance);
      } catch (error) {
        console.error("Error fetching asset balances:", error);
      }
    };

    if (address) {
      getData();
    }
  }, [address]);

  useEffect(() => {
    const getData = async () => {
      const asset0 = getAssetAddress(asset);
      const asset1 = getAssetAddress("USDC");
      const quoteIn = await getQuote(asset0, asset1, depositAmount);
      const quoteOut = await getQuote(asset1, asset0, withdrawAmount);
      setDepositQuote(quoteIn);
      setWithdrawQuote(quoteOut);
    };
    if (asset !== "USDC") {
      getData();
    }
  }, [asset]);

  useEffect(() => {
    const getData = async () => {
      const asset0 = getAssetAddress(asset);
      const asset1 = getAssetAddress("USDC");
      const quoteIn = await getQuote(asset0, asset1, depositAmount);
      setDepositQuote(quoteIn);
    };
    if (asset !== "USDC") {
      getData();
    }
  }, [depositAmount]);

  useEffect(() => {
    const getData = async () => {
      const asset0 = getAssetAddress(asset);
      const asset1 = getAssetAddress("USDC");
      const assetReceived = await previewRedeem(withdrawAmount);
      const quoteOut = await getQuote(asset1, asset0, assetReceived.toString());
      setWithdrawQuote(quoteOut);
    };
    if (asset !== "USDC") {
      getData();
    }
  }, [withdrawAmount]);

  function getBalance(assetName: string) {
    const asset = assets.find((a: any) => a.name === assetName);
    if (asset) {
      return asset.balance;
    }
    return 0;
  }

  async function depositWithSwap() {
    setDepositLoading(true);
    try {
      if (asset !== "USDC") {
        const fromAsset = getAssetAddress(asset);
        const toAsset = getAssetAddress("USDC");
        await swap(fromAsset, toAsset, depositAmount);
      }
      const tx = await deposit(depositQuote.toString());
      setTx(tx);
    } catch (error) {
      console.log(error);
    } finally {
      setDepositLoading(false);
    }
  }

  async function depositAsset() {
    setDepositLoading(true);
    try {
      const tx = await deposit(depositAmount);
      setTx(tx);
    } catch (error) {
      console.log(error);
    } finally {
      setDepositLoading(false);
    }
  }

  async function withdrawWithSwap() {
    setWithdrawLoading(true);
    try {
      const assetReceived = await previewRedeem(withdrawAmount);
      await withdraw(withdrawAmount);
      const fromAsset = getAssetAddress("USDC");
      const toAsset = getAssetAddress(asset);
      await swap(fromAsset, toAsset, assetReceived.toString());
      setTx(tx);
    } catch (error) {
      console.log(error);
    } finally {
      setWithdrawLoading(false);
    }
  }

  async function withdrawAsset() {
    setWithdrawLoading(true);
    try {
      const tx = await withdraw(amount);
      setTx(tx);
    } catch (error) {
      console.log(error);
    } finally {
      setWithdrawLoading(false);
    }
  }

  async function swapAsset() {
    setQuoteLoading(true);
    try {
      const fromAssetAddress = getAssetAddress(asset);
      const toAssetAddress = getAssetAddress(toAsset);
      const tx = await swap(fromAssetAddress, toAssetAddress, swapAmount);
      setTx(tx);
    } catch (error) {
      console.log(error);
    } finally {
      setQuoteLoading(false);
    }
  }

  return (
    <div className="flex flex-col justify-center items-center">
      {!address && (
        <div className="h1">Please install Metamask and connect.</div>
      )}

      {address && (
        <>
          {step === 0 && (
            <>
              <div className="w-full">
                <div className="w-full flex justify-between text-2xl mb-2 ">
                  <div>My saving: </div>
                  <div className="font-bold ">${savingBalance.toFixed(2)}</div>
                </div>
                <div className="w-full flex justify-between text-left font-bold text-l text-colors-primary">
                  <div>Bal: {savingBalance.toFixed(2)} | 6.5% APY</div>
                  <div>
                    {savingBalance > 0 ? (
                      <Button
                        onClick={() => setStep(2)}
                        variant="outline"
                        className="w-20 h-6 border-none text-red-500 bg-white shadow-none"
                      >
                        {" "}
                        Withdraw
                      </Button>
                    ) : (
                      <></>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-full text-2xl text-left pb-1 mt-4">
                My balance:{" "}
              </div>

              <div className="w-full">
                {assets.map((a: any) => {
                  if (a.balance === 0) return null;
                  return (
                    <div key={a.name} className="mt-2">
                      <div className="w-full flex justify-between text-2xl font-bold mb-1">
                        <div className="flex self-center">
                          <div>
                            <Image
                              src={a.icon}
                              alt={a.name}
                              width={35}
                              height={35}
                            />
                          </div>
                          <div className="ml-2">{a.name}</div>
                        </div>
                        <div>{a.balance.toFixed(2)}</div>
                      </div>
                      <div className="w-full flex flex-row-reverse">
                        <Button
                          variant="default"
                          onClick={() => {
                            setAsset(a.name);
                            setStep(1);
                            console.log("asset: ", a.name);
                          }}
                          className="rounded-lg bg-white text-colors-primary p-1 shadow-none"
                        >
                          Save
                        </Button>
                        <div>
                          <Separator
                            orientation="vertical"
                            className="bg-colors-primary w-0.5 h-full"
                          />
                        </div>
                        <Button
                          variant="default"
                          onClick={() => {
                            setAsset(a.name);
                            setStep(3);
                            console.log("asset: ", a.name);
                          }}
                          className="rounded-lg bg-white text-colors-primary p-1 shadow-none"
                        >
                          Swap
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {step === 1 ? (
            <>
              <div className="w-full flex justify-start text-sm font-normal mb-4">
                <Button
                  onClick={() => setStep(0)}
                  className="p-1 h-6"
                  variant="outline"
                >
                  {"< Back"}
                </Button>
              </div>
              <div className="w-full flex font-semibold justify-between text-xl mb-4 ">
                <div>Enter amount to deposit: </div>
              </div>
              <div className="flex w-full justify-between mb-4">
                <div className="w-full pr-2">
                  <Input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.1"
                    className="w-full"
                  />
                </div>

                <div className="border-grey-600 text-colors-primary font-semibold border-2 p-2 rounded-lg flex justify-between items-center">
                  {asset}
                </div>
              </div>
              <div className="flex w-full justify-between mb-4 text-gray-500">
                Available balance {asset}:{" "}
                {getBalance(asset).toString().split(".")[0] +
                  "." +
                  getBalance(asset).toString().split(".")[1].slice(0, 2)}
              </div>
              {asset === "USDC" ? (
                <></>
              ) : (
                <>
                  <div className="w-full font-semibold text-xl mb-4">
                    You are expected to receive:
                  </div>
                  <div className="w-full flex justify-between mb-9">
                    <div className="px-2 py-3 w-80 bg-grey-800 border-2 rounded-lg border-grey-600 mr-2">
                      {depositQuote}
                    </div>
                    <div className="border-grey-600 text-colors-primary font-semibold border-2 p-2 rounded-lg flex justify-between items-center">
                      USDyC
                    </div>
                  </div>
                </>
              )}
              <Button
                onClick={() => {
                  if (asset === "USDC") {
                    depositAsset();
                  } else {
                    depositWithSwap();
                  }
                }}
                className="w-full rounded-2xl bg-colors-primary"
              >
                Confirm
              </Button>
            </>
          ) : (
            <></>
          )}
          {step === 2 ? (
            <>
              <div className="w-full flex justify-start text-sm font-normal mb-4">
                <Button
                  onClick={() => setStep(0)}
                  className="p-1 h-6"
                  variant="outline"
                >
                  {"< Back"}
                </Button>
              </div>
              <div className="w-full flex font-semibold justify-between text-xl mb-4 ">
                <div>Enter amount to withdraw and currency: </div>
              </div>
              <div className="flex w-full justify-between mb-4">
                <div className="w-full ">
                  <Input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.1"
                    className="w-full"
                  />
                </div>
                <div className="flex items-center justify-center p-1 text-center mx-2">
                  To
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="border rounded-md px-3 py-2h-full w-[20%]"
                    >
                      {asset}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-2 border rounded-md bg-white"
                    style={{ width: "100%" }}
                  >
                    <ul className="space-y-2">
                      {assets.map((a: any) => {
                        if (asset === a.name) return null;
                        return (
                          <li key={a.name}>
                            <button
                              className="w-full text-center px-2 py-1 hover:bg-gray-100"
                              onClick={() => {
                                setAsset(a.name);
                              }}
                            >
                              {a.name}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex w-full justify-between mb-4 text-gray-500">
                Available USDyC balance: {savingBalance.toString().slice(0, 4)}
              </div>

              {asset === "USDC" ? (
                <></>
              ) : (
                <>
                  <div className="w-full font-semibold text-xl mb-4">
                    You are expected to receive:
                  </div>
                  <div className="w-full flex justify-between mb-9">
                    <div className="px-2 py-3 w-80 bg-grey-800 border-2 rounded-lg border-grey-600 mr-2">
                      {withdrawQuote.toFixed(2)}
                    </div>
                    <div className="border-grey-600 text-colors-primary font-semibold border-2 p-2 rounded-lg flex justify-between items-center">
                      {asset}
                    </div>
                  </div>
                </>
              )}
              <Button
                onClick={() => {
                  if (asset === "USDC") {
                    withdrawAsset();
                  } else {
                    withdrawWithSwap();
                  }
                }}
                className="w-full rounded-2xl bg-colors-primary"
              >
                Confirm
              </Button>
            </>
          ) : (
            <></>
          )}

          {step === 3 ? (
            <>
              <div className="w-full flex justify-start text-sm font-normal mb-4">
                <Button
                  onClick={() => setStep(0)}
                  className="p-1 h-6"
                  variant="outline"
                >
                  {"< Back"}
                </Button>
              </div>
              <div className="w-full flex font-semibold justify-between text-xl mb-4 ">
                <div>Enter amount to swap: </div>
              </div>
              <div className="flex w-full justify-between mb-4">
                <div className="w-full pr-2">
                  <Input
                    type="number"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    placeholder="0.1"
                    className="w-full"
                  />
                </div>
                <div className="border-grey-600 text-colors-primary font-semibold border-2 p-2 rounded-lg flex justify-between items-center">
                  {asset}
                </div>
              </div>
              <div className="flex w-full justify-between mb-4 text-gray-500">
                Available balance {asset}:{" "}
                {getBalance(asset).toString().split(".")[0] +
                  "." +
                  getBalance(asset).toString().split(".")[1].slice(0, 2)}
              </div>

              <>
                <div className="w-full font-semibold text-xl mb-4">
                  You are expected to receive:
                </div>
                <div className="w-full flex justify-between mb-9">
                  <div className="w-4/5 px-2 py-3 w-80 bg-grey-800 border-2 rounded-lg border-grey-600 mr-2">
                    {swapQuote.toFixed(2)}
                  </div>
                  <div className="w-1/5">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="border rounded-md px-3 py-2 h-full w-full"
                        >
                          {toAsset}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="p-2 border rounded-md bg-white"
                        style={{ width: "100%" }}
                      >
                        <ul className="space-y-2">
                          {assets.map((a: any) => {
                            if (toAsset === a.name) return null;
                            return (
                              <li key={a.name}>
                                <button
                                  className="w-full text-center px-2 py-1 hover:bg-gray-100"
                                  onClick={() => {
                                    setToAsset(a.name);
                                  }}
                                >
                                  {a.name}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </>
              <Button
                onClick={() => {
                  if (asset === toAsset) {
                    return;
                  } else {
                    swapAsset();
                  }
                }}
                className="w-full rounded-2xl bg-colors-primary"
              >
                Swap
              </Button>
            </>
          ) : (
            <></>
          )}
        </>
      )}
    </div>
  );
}
