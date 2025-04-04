import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../firebaseConfig";
import Navbar from "../components/Navbar";
import TimeAlert from "../components/TimeAlert";

function HomePage() {
  const [incubatorData, setIncubatorData] = useState({
    temperature: "Loading...",
    humidity: "Loading...",
    water_presence: "Loading...",
    heater_status: "Loading...",
    fan_status: "Loading...",
    Egg_turner_status: "Loading...",
    time: "Loading...",
  });

  useEffect(() => {
    const dataRef = ref(database, "incubator_data");
    const unsubscribe = onValue(
      dataRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          console.log(data);
          const timeString = data.time
            ? `${data.time.days} days, ${data.time.hours}:${data.time.minutes}:${data.time.seconds}`
            : "N/A";

          setIncubatorData({
            temperature: data.temperature || "N/A",
            humidity: data.humidity || "N/A",
            water_presence: data.water_presence || "N/A",
            heater_status: data.heater_status || "N/A",
            fan_status: data.fan_status || "N/A",
            Egg_turner_status: data.Egg_turner_status || "N/A",
            time: timeString,
          });
        }
      },
      (error) => {
        console.error("Error fetching data:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      <Navbar />
      <TimeAlert />
      <div className="mx-auto w-full 2xl:container mt-4 px-4 flex-grow">
        <h1 className="text-3xl text-center text-primary-green mb-6">
          Incubator Data
        </h1>
        <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
          {Object.entries(incubatorData).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between border-b pb-2 last:border-b-0"
            >
              <span className="capitalize font-medium">
                {key.replace(/_/g, " ")}:
              </span>
              <span className="text-green-600 font-semibold">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <footer className="text-center py-4 text-gray-600">
        © 2025 | IOT Egg Incubator
      </footer>
    </div>
  );
}

export default HomePage;
