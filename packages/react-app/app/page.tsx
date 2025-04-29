"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWeb3 } from "@/contexts/useWeb3";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const {
    address,
    getUserAddress,
    deposit,
    withdraw,
    swap,
    getAssetBalance,
    getAssetAddress,
  } = useWeb3();

  const [asset, setAsset] = useState<string>("USDC");
  const [balance, setBalance] = useState<number>(0);

  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);

  const [tx, setTx] = useState<any>(undefined);
  const [amount, setAmount] = useState<string>("0.1"); // State to track the amount to send
  const [messageSigned, setMessageSigned] = useState<boolean>(false); // State to track if a message was signed

  useEffect(() => {
    getUserAddress();
  }, []);

  useEffect(() => {
    const getData = async () => {
      const assetAddress = getAssetAddress(asset);
      const balance = await getAssetBalance(assetAddress);
      console.log("balance: ", balance);
      setBalance(balance);
    };
    if (address) {
      getData();
    }
  }, [address, asset]);

  useEffect(() => {
    const getData = async () => {
      const assetAddress = getAssetAddress(asset);
      const balance = await getAssetBalance(assetAddress);
      setBalance(balance);
    };
    if (address) {
      getData();
    }
  }, [asset]);

  async function depositAsset() {
    setDepositLoading(true);
    try {
      const tx = await deposit(amount);
      setTx(tx);
    } catch (error) {
      console.log(error);
    } finally {
      setDepositLoading(false);
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

  const assets = ["cUSD", "cKES", "cREAL", "USDC"];
  return (
    <div className="flex flex-col justify-center items-center">
      {!address && (
        <div className="h1">Please install Metamask and connect.</div>
      )}
      {address && (
        <div className="h1">
          There you go... a canvas for your next Minipay project!
        </div>
      )}

      {address && (
        <>
          <div className="h2 text-center">
            Your address: <span className="font-bold text-sm">{address}</span>
          </div>

          <div className="h2 text-center">
            Your balance:{" "}
            <span className="font-bold text-sm">
              {balance} {asset}
            </span>
          </div>
          {tx && (
            <p className="font-bold mt-4">
              Tx Completed:{" "}
              <a
                href={`https://celoscan.io/tx/${tx.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                {tx.transactionHash.substring(0, 6)}...
                {tx.transactionHash.substring(tx.transactionHash.length - 6)}
              </a>
            </p>
          )}
          <div className="w-full px-3 mt-7">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="border rounded-md px-3 py-2 w-full mb-3"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="border rounded-md px-3 py-2 mb-3 h-[42px] "
                    // Ensures the button takes full width
                  >
                    {asset}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-2 border rounded-md bg-white"
                  style={{ width: "100%" }} // Matches the width of the trigger
                >
                  <ul className="space-y-2">
                    {assets.map((a) => {
                      if (asset === a) return null;
                      else {
                        return (
                          <li key={a}>
                            <button
                              className="w-full text-left px-2 py-1 hover:bg-gray-100"
                              onClick={() => {
                                setAsset(a);
                                setAmount("0.1");
                              }}
                            >
                              {a}
                            </button>
                          </li>
                        );
                      }
                    })}
                  </ul>
                </PopoverContent>
              </Popover>
            </div>
            <Button
              loading={depositLoading}
              onClick={depositAsset}
              title={`Deposit`}
              widthFull
            />
          </div>

          <div className="w-full px-3 mt-6">
            <Button
              loading={withdrawLoading}
              onClick={withdrawAsset}
              title="Withdraw"
              widthFull
            />
          </div>
        </>
      )}
    </div>
  );
}
