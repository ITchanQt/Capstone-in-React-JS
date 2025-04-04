import React, { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { database } from "../firebaseConfig";
import { Button } from "@/components/ui/button";
import Navbar from "../components/Navbar";
import TimeAlert from "../components/TimeAlert";

function ControlPage() {
  const [setTemperature, setSetTemperature] = useState("Loading...");
  const [turnerStatus, setTurnerStatus] = useState("Loading...");

  useEffect(() => {
    const dataRef = ref(database, "incubator_data");
    const unsubscribe = onValue(
      dataRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setSetTemperature(data.set_temperature || "N/A");
          setTurnerStatus(data.Btn_turner_status || "Unknown");
        }
      },
      (error) => {
        console.error("Error fetching data:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleTemperatureChange = (change) => {
    const dataRef = ref(database, "incubator_data");
    update(dataRef, { set_temperature: setTemperature + change });
  };

  const handleTurnerToggle = () => {
    const dataRef = ref(database, "incubator_data");
    const newStatus = turnerStatus === "ON" ? "OFF" : "ON";
    update(dataRef, { Btn_turner_status: newStatus });
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      <Navbar />
      <TimeAlert />
      <div className="mx-auto w-full 2xl:container mt-4 px-4 flex-grow">
        <h1 className="text-3xl text-center text-primary-green mb-6">
          Controls
        </h1>
        <div className="bg-white shadow-md rounded-lg p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl text-green-600 mb-4">{setTemperature}°C</h2>
            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => handleTemperatureChange(1)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-2xl"
              >
                ▲
              </Button>
              <Button
                onClick={() => handleTemperatureChange(-1)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-2xl"
              >
                ▼
              </Button>
            </div>
          </div>

          <Button
            onClick={handleTurnerToggle}
            className={`w-full py-3 rounded transition-colors ${
              turnerStatus === "ON"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-yellow-500 hover:bg-yellow-600"
            } text-white text-lg`}
          >
            Turner is {turnerStatus}
          </Button>
          <p className="text-center text-gray-500">
            Controls the temperature and egg turn!
          </p>
        </div>
      </div>
      <footer className="text-center py-4 text-gray-600">
        © 2025 | IOT Egg Incubator
      </footer>
    </div>
  );
}

export default ControlPage;
