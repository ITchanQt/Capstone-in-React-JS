import React, { useState, useEffect } from "react";
import { ref, onValue, remove, get } from "firebase/database";
import { database } from "../firebaseConfig";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Button } from "../components/ui/button";
import { Calendar, Home, Inbox, Search, Settings, Trash2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Menu items grouped by section
const navigationItems = {
  main: [
    {
      title: "Home",
      icon: Home,
      url: "#",
      isActive: true,
    },
    {
      title: "Search",
      icon: Search,
      url: "#",
    },
    {
      title: "Inbox",
      icon: Inbox,
      url: "#",
      badge: "3",
    },
  ],
  preferences: [
    {
      title: "Calendar",
      icon: Calendar,
      url: "#",
    },
    {
      title: "Settings",
      icon: Settings,
      url: "#",
    },
  ],
};

const Datalogs = () => {
  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDayModal, setShowDeleteDayModal] = useState(false);
  const [showDeleteHourModal, setShowDeleteHourModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [hourToDelete, setHourToDelete] = useState(null);
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [searchDay, setSearchDay] = useState(""); // Input for day search
  const [searchHour, setSearchHour] = useState(""); // Input for hour search
  const [searchResult, setSearchResult] = useState(null); // Search result data

  // Fetch only the day keys initially
  useEffect(() => {
    const logsRef = ref(database, "logs");
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setDays(Object.keys(data));
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch data for a specific day when selected
  const handleDayClick = async (day) => {
    if (selectedDay === day) {
      setSelectedDay(null);
      setDayData(null);
      return;
    }

    setIsLoading(true);
    const dayRef = ref(database, `logs/${day}`);
    onValue(dayRef, (snapshot) => {
      const data = snapshot.val();
      setDayData(data);
      setSelectedDay(day);
      setIsLoading(false);
    });
  };

  const handleDeleteDay = async () => {
    if (!selectedDay) return;
    try {
      await remove(ref(database, `logs/${selectedDay}`));
      setDays(days.filter((day) => day !== selectedDay));
      setSelectedDay(null);
      setDayData(null);
      setShowDeleteDayModal(false);
    } catch (error) {
      console.error("Error deleting day:", error);
    }
  };

  const handleDeleteHour = async () => {
    if (!selectedDay || !hourToDelete) return;
    try {
      await remove(ref(database, `logs/${selectedDay}/${hourToDelete}`));
      const updatedData = { ...dayData };
      delete updatedData[hourToDelete];
      setDayData(updatedData);
      setShowDeleteHourModal(false);
      setHourToDelete(null);
    } catch (error) {
      console.error("Error deleting hour:", error);
    }
  };

  const handleResetSystem = async () => {
    try {
      await remove(ref(database, "logs"));
      await remove(ref(database, "last_time"));
      await remove(ref(database, "incubator_data"));
      setDays([]);
      setSelectedDay(null);
      setDayData(null);
      setShowResetModal(false);
      setResetConfirmed(false);
    } catch (error) {
      console.error("Error resetting system:", error);
    }
  };

  const downloadPDF = (hour) => {
    try {
      const doc = new jsPDF("landscape", "mm", "a4");

      // Constants for page layout
      const margin = 10;
      const rowHeight = 5;
      const headerHeight = 25;
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxRowsPerPage = Math.floor(
        (pageHeight - headerHeight - margin) / rowHeight
      );

      // Function to add header
      const addHeader = () => {
        doc.setFontSize(16);
        doc.text(`Data for ${selectedDay} - ${hour}`, margin, 15);
        doc.setFontSize(8);

        const columns = [
          "Minutes",
          "Button Turner",
          "Egg Turner",
          "Fan Status",
          "Heater Status",
          "Humidity",
          "Temperature",
          "Water",
        ];

        const columnWidth = (pageWidth - 2 * margin) / columns.length;

        columns.forEach((column, i) => {
          doc.text(column, margin + i * columnWidth, headerHeight);
        });

        return columnWidth;
      };

      // Get all rows
      const allRows = Object.entries(dayData[hour]).map(([minute, data]) => [
        minute,
        data.Button_turner_status || "",
        data.Egg_turner_status || "",
        data["Fan Status"] || "",
        data.Heater_status || "",
        data.Humidity || "",
        data.Temperature || "",
        data.Water_presense || "",
      ]);

      // Calculate number of pages needed
      const totalPages = Math.ceil(allRows.length / maxRowsPerPage);

      // Process each page
      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        if (pageNum > 0) {
          doc.addPage();
        }

        const columnWidth = addHeader();

        // Get rows for current page
        const startIdx = pageNum * maxRowsPerPage;
        const endIdx = Math.min((pageNum + 1) * maxRowsPerPage, allRows.length);
        const pageRows = allRows.slice(startIdx, endIdx);

        // Draw rows for current page
        pageRows.forEach((rowData, rowIndex) => {
          const y = headerHeight + (rowIndex + 1) * rowHeight;
          rowData.forEach((text, colIndex) => {
            doc.text(String(text), margin + colIndex * columnWidth, y);
          });
        });

        // Add page number
        doc.setFontSize(8);
        doc.text(
          `Page ${pageNum + 1} of ${totalPages}`,
          pageWidth - margin,
          pageHeight - margin,
          { align: "right" }
        );
      }

      // Save the PDF
      doc.save(`Data_${selectedDay}_${hour}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  // Alternative: Add a CSV download option
  const downloadCSV = (hour) => {
    try {
      const headers = [
        "Minutes",
        "Button Turner",
        "Egg Turner",
        "Fan Status",
        "Heater Status",
        "Humidity",
        "Temperature",
        "Water Presence",
      ].join(",");

      const rows = Object.entries(dayData[hour]).map(([minute, data]) =>
        [
          minute,
          data.Button_turner_status || "",
          data.Egg_turner_status || "",
          data["Fan Status"] || "",
          data.Heater_status || "",
          data.Humidity || "",
          data.Temperature || "",
          data.Water_presense || "",
        ].join(",")
      );

      const csvContent = [headers, ...rows].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `Data_${selectedDay}_${hour}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating CSV:", error);
    }
  };

  // Handle search for specific day and hour
  const handleSearch = async () => {
    if (!searchDay || !searchHour) {
      alert("Please enter both day and hour to search.");
      return;
    }

    try {
      const hourRef = ref(database, `logs/${searchDay}/${searchHour}`);
      const snapshot = await get(hourRef);

      if (snapshot.exists()) {
        setSearchResult(snapshot.val());
      } else {
        alert("No data found for the specified day and hour.");
        setSearchResult(null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("An error occurred while searching. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="spinner">Loading...</div>;
  }

  return (
    <div className="max-w-full p-4">
      <div className="container relative mx-auto bg-gradient-to-b from-[#16a34a] via-[#4ade80] to-[#bbf7d0]">
        <div className="p-4 -z-10">
          <h1 className="text-2xl font-bold text-white font-sans">Data Logs</h1>
        </div>

        {/* Search Section */}
        <div className="p-4 bg-white rounded shadow mb-4 mx-4">
          <h2 className="text-lg font-bold mb-2">Search Data</h2>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter Day (e.g., day1)"
              value={searchDay}
              onChange={(e) => setSearchDay(e.target.value)}
              className="p-2 border rounded w-full"
            />
            <input
              type="text"
              placeholder="Enter Hour (e.g., hour1)"
              value={searchHour}
              onChange={(e) => setSearchHour(e.target.value)}
              className="p-2 border rounded w-full"
            />
            <button
              onClick={handleSearch}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Search
            </button>
          </div>
        </div>

        {/* Display Search Result */}
        {searchResult && (
          <div className="mb-8 bg-white p-4 rounded shadow mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                Data for {searchDay} - {searchHour}
              </h3>
              <button
                onClick={() => setSearchResult(null)} // Clear the search result
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border p-2">Minutes</th>
                    <th className="border p-2">Button Turner</th>
                    <th className="border p-2">Egg Turner</th>
                    <th className="border p-2">Fan Status</th>
                    <th className="border p-2">Heater Status</th>
                    <th className="border p-2">Humidity</th>
                    <th className="border p-2">Temperature</th>
                    <th className="border p-2">Water Presence</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(searchResult).map(([minute, data]) => (
                    <tr key={minute}>
                      <td className="border p-2">{minute}</td>
                      <td className="border p-2">
                        {data.Button_turner_status}
                      </td>
                      <td className="border p-2">{data.Egg_turner_status}</td>
                      <td className="border p-2">{data["Fan Status"]}</td>
                      <td className="border p-2">{data.Heater_status}</td>
                      <td className="border p-2">{data.Humidity}</td>
                      <td className="border p-2">{data.Temperature}</td>
                      <td className="border p-2">{data.Water_presense}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <SidebarProvider>
          <div className="mx-auto">
            <Sidebar className="z-1">
              <SidebarHeader className="border-b">
                <div className="p-2 flex justify-between">
                  <h2 className="text-lg font-semibold">My App</h2>
                  <SidebarTrigger />
                </div>
              </SidebarHeader>
              <SidebarContent>
                {/* Main Navigation */}
                <SidebarGroup>
                  <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {days.map((day) => (
                        <SidebarMenuItem key={day}>
                          <div className="flex gap-2">
                            <SidebarMenuButton
                              onClick={() => handleDayClick(day)}
                              className={`p-2 rounded bg-green-600 hover:bg-green-500 ${
                                selectedDay === day
                                  ? "bg-green-600 text-black"
                                  : "bg-green-500 text-white"
                              }`}
                            >
                              {day}
                            </SidebarMenuButton>
                            <SidebarMenuButton
                              onClick={() => setShowDeleteDayModal(true)}
                              className="rounded"
                              variant="outline"
                            >
                              <Trash2 className="text-red-500" />
                            </SidebarMenuButton>
                          </div>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                {/* Preferences */}
                <SidebarGroup>
                  <SidebarGroupLabel>Preferences</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => (window.location.href = "/")}
                          className="mr-2"
                        >
                          Back
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => setShowResetModal(true)}
                          className=""
                        >
                          Reset All Data
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter className="border-t p-4">
                <div className="text-xs text-muted-foreground">
                  © 2025 My App Inc.
                </div>
              </SidebarFooter>
              <SidebarRail />
            </Sidebar>
            {/* Main content */}
            <div className="px-4 z-10 mt-8 mx-auto w-full grid grid-cols-1 xl:grid-cols-2 xl:gap-8">
              <SidebarTrigger className="absolute left-0 top-0" />
              {selectedDay &&
                dayData &&
                Object.entries(dayData).map(([hour, hourData]) => (
                  <div
                    key={hour}
                    className="mb-8 bg-white p-4 rounded shadow w-full"
                    id={`table-${hour}`}
                  >
                    <h3 className="text-lg font-bold mb-4">
                      Data for {selectedDay} - {hour}
                    </h3>
                    <div className="overflow-x-auto">
                      <Table className="w-full border-collapse text-xs">
                        <TableCaption>
                          {selectedDay} - {hour}
                        </TableCaption>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Minutes</TableHead>
                            <TableHead>Button Turner</TableHead>
                            <TableHead>Egg Turner</TableHead>
                            <TableHead>Fan Status</TableHead>
                            <TableHead>Heater Status</TableHead>
                            <TableHead>Humidity</TableHead>
                            <TableHead>Temperature</TableHead>
                            <TableHead>Water Presence</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(hourData).map(([minute, data]) => (
                            <TableRow key={minute}>
                              <TableCell>{minute}</TableCell>
                              <TableCell>{data.Button_turner_status}</TableCell>
                              <TableCell>{data.Egg_turner_status}</TableCell>
                              <TableCell>{data["Fan Status"]}</TableCell>
                              <TableCell>{data.Heater_status}</TableCell>
                              <TableCell>{data.Humidity}</TableCell>
                              <TableCell>{data.Temperature}</TableCell>
                              <TableCell>{data.Water_presense}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={8} className="p-2 space-x-1">
                              <Button
                                onClick={() => downloadPDF(hour)}
                                className="bg-green-600 text-white px-4 py-2 rounded"
                              >
                                Download PDF
                              </Button>
                              <Button
                                onClick={() => downloadCSV(hour)}
                                className="bg-blue-600 text-white px-4 py-2 rounded"
                              >
                                Download CSV
                              </Button>
                              <Button
                                onClick={() => {
                                  setHourToDelete(hour);
                                  setShowDeleteHourModal(true);
                                }}
                                className="bg-red-500 text-white px-4 py-2 rounded"
                              >
                                Delete Hour
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </SidebarProvider>
      </div>

      {/* Delete Day Modal */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 ${
          showDeleteDayModal ? "block" : "hidden"
        }`}
      >
        <div className="bg-white p-6 rounded-lg w-96 mx-auto mt-40">
          <h4 className="text-xl font-bold mb-4">Confirm Delete Day</h4>
          <p>
            Are you sure you want to delete this day's data? This action cannot
            be undone.
          </p>
          <div className="flex justify-end gap-2 mt-6">
            <button
              className="px-4 py-2 bg-gray-200 rounded"
              onClick={() => setShowDeleteDayModal(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded"
              onClick={handleDeleteDay}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete Hour Modal */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 ${
          showDeleteHourModal ? "block" : "hidden"
        }`}
      >
        <div className="bg-white p-6 rounded-lg w-96 mx-auto mt-40">
          <h4 className="text-xl font-bold mb-4">Confirm Delete Hour</h4>
          <p>
            Are you sure you want to delete this hour's data? This action cannot
            be undone.
          </p>
          <div className="flex justify-end gap-2 mt-6">
            <button
              className="px-4 py-2 bg-gray-200 rounded"
              onClick={() => setShowDeleteHourModal(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded"
              onClick={handleDeleteHour}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Reset System Modal */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 ${
          showResetModal ? "block" : "hidden"
        }`}
      >
        <div className="bg-white p-6 rounded-lg w-96 mx-auto mt-40">
          <h4 className="text-xl font-bold mb-4">Confirm System Reset</h4>
          <p className="mb-4">
            WARNING: This will reset ALL data in the system. All logs, incubator
            data, and time settings will be erased. This action cannot be
            undone.
          </p>
          <p className="mb-4 text-red-500">
            Note: Make sure that the Incubator is unplugged or has no power
            before you confirm the reset!
          </p>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={resetConfirmed}
                onChange={(e) => setResetConfirmed(e.target.checked)}
                className="mr-2"
              />
              I understand this action will erase all data
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-gray-200 rounded"
              onClick={() => {
                setShowResetModal(false);
                setResetConfirmed(false);
              }}
            >
              Cancel
            </button>
            <button
              className={`px-4 py-2 text-white rounded ${
                resetConfirmed ? "bg-red-500" : "bg-gray-400"
              }`}
              onClick={handleResetSystem}
              disabled={!resetConfirmed}
            >
              Reset System
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Datalogs;
