import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';

function TimeAlert() {
  const [isTimeRunning, setIsTimeRunning] = useState(true);
  const [lastTime, setLastTime] = useState(null);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    let timeoutId;

    const dataRef = ref(database, 'incubator_data/time');
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const timeData = snapshot.val();
      
      if (timeData) {
        // If this is the first time we're seeing the data, mark it as running
        if (!lastTime) {
          setLastTime(timeData);
          setIsTimeRunning(true);
          setShowAlert(false);
          return;
        }

        // Check if time has actually changed
        const timeChanged = 
          timeData.days !== lastTime.days ||
          timeData.hours !== lastTime.hours ||
          timeData.minutes !== lastTime.minutes ||
          timeData.seconds !== lastTime.seconds;

        if (!timeChanged) {
          // Start 10-second countdown if time is not changing
          timeoutId = setTimeout(() => {
            setShowAlert(true);
          }, 10000);
        } else {
          // Clear timeout and reset states if time is changing
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          setLastTime(timeData);
          setIsTimeRunning(true);
          setShowAlert(false);
        }
      } else {
        // No time data at all
        setIsTimeRunning(false);
        setShowAlert(true);
      }
    }, (error) => {
      console.error('Error tracking time:', error);
      setIsTimeRunning(false);
      setShowAlert(true);
    });

    // Cleanup function
    return () => {
      unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [lastTime]);

  if (!showAlert) return null;

  return (
    <div className="fixed top-16 md:top-18 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in w-[98%] md:w-fit">
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Warning!</strong> The incubator is not running.
      </div>
    </div>
  );
}

export default TimeAlert;