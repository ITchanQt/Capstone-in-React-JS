import React, { useState, useEffect } from "react";
import { ref, onValue, remove, get } from "firebase/database";
import { database } from "../firebaseConfig";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Button } from "../components/ui/button";
import { CalendarDays, RotateCcw, SkipBack, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

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
  const [isTableVisible, setIsTableVisible] = useState(false);

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
      setIsTableVisible(false);
      setSearchResult(null);
      return;
    }

    setIsLoading(true);
    const dayRef = ref(database, `logs/${day}`);
    onValue(dayRef, (snapshot) => {
      const data = snapshot.val();
      setDayData(data);
      setSelectedDay(day);
      setIsTableVisible(true);
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
      const data = searchResult || dayData[hour];
      const title = searchResult
        ? `${searchDay}_${searchHour}`
        : `${selectedDay}_${hour}`;

      const margin = 10;
      const rowHeight = 5;
      const headerHeight = 25;
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxRowsPerPage = Math.floor(
        (pageHeight - headerHeight - margin) / rowHeight
      );

      const addHeader = () => {
        doc.setFontSize(16);
        doc.text(`Data for ${title}`, margin, 15);
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
      const allRows = Object.entries(data).map(([minute, rowData]) => [
        minute,
        rowData.Button_turner_status || "",
        rowData.Egg_turner_status || "",
        rowData["Fan Status"] || "",
        rowData.Heater_status || "",
        rowData.Humidity || "",
        rowData.Temperature || "",
        rowData.Water_presense || "",
      ]);

      const totalPages = Math.ceil(allRows.length / maxRowsPerPage);

      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        if (pageNum > 0) {
          doc.addPage();
        }

        const columnWidth = addHeader();

        const startIdx = pageNum * maxRowsPerPage;
        const endIdx = Math.min((pageNum + 1) * maxRowsPerPage, allRows.length);
        const pageRows = allRows.slice(startIdx, endIdx);

        pageRows.forEach((rowData, rowIndex) => {
          const y = headerHeight + (rowIndex + 1) * rowHeight;
          rowData.forEach((text, colIndex) => {
            doc.text(String(text), margin + colIndex * columnWidth, y);
          });
        });

        doc.setFontSize(8);
        doc.text(
          `Page ${pageNum + 1} of ${totalPages}`,
          pageWidth - margin,
          pageHeight - margin,
          { align: "right" }
        );
      }

      // Save the PDF
      doc.save(`Data_${title}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

  const downloadCSV = (hour) => {
    try {
      const data = searchResult || dayData[hour];
      const title = searchResult
        ? `${searchDay}_${searchHour}`
        : `${selectedDay}_${hour}`;

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

      const rows = Object.entries(data).map(([minute, rowData]) =>
        [
          minute,
          rowData.Button_turner_status || "",
          rowData.Egg_turner_status || "",
          rowData["Fan Status"] || "",
          rowData.Heater_status || "",
          rowData.Humidity || "",
          rowData.Temperature || "",
          rowData.Water_presense || "",
        ].join(",")
      );

      const csvContent = [headers, ...rows].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `Data_${title}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating CSV:", error);
      alert("Error generating CSV. Please try again.");
    }
  };

  // Handle search for specific day and hour
  const handleSearch = async () => {
    setIsTableVisible(false);
    if (!searchDay || !searchHour) {
      toast("ERROR!", {
        description: "Please enter both day and hour to search.",
        action: {
          label: "Try Again"
        }
      })
      // alert("Please enter both day and hour to search.");
      return;
    }

    try {
      const hourRef = ref(database, `logs/${searchDay}/${searchHour}`);
      const snapshot = await get(hourRef);

      if (snapshot.exists()) {
        setSearchResult(snapshot.val());
      } else {
        toast("ERROR!", {
          description: "No data found for the specified day and hour.",
          action: {
            label: "Try Again"
          }
        })
        // alert("No data found for the specified day and hour.");
        setSearchResult(null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast("ERROR!", {
        description: "An error occurred while searching. Please try again",
        action: {
          label: "Try Again"
        }
      })
      // alert("An error occurred while searching. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-green-500 animate-spin"></div>
          <div className="mt-4 text-center text-lg font-semibold text-green-600">
            Loading...
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-full p-4 bg-indigo-100 min-h-screen">
      <Toaster />
      <div className="container relative mx-auto bg-gradient-to-r from-[#16a34a] to-[#4ade80] rounded-md border shadow-lg">
        {/* Search Section */}
        <div className="p-4 bg-white rounded shadow mb-4 mx-4 mt-8">
          <h1 className="text-center font-bold font-sans text-2xl text-green-600">
            Data Logs
          </h1>
          <h2 className="text-lg font-bold mb-2 mt-4">Search Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="text"
              placeholder="Enter Day (e.g., day1)"
              value={searchDay}
              onChange={(e) => setSearchDay(e.target.value)}
              className="p-2 border rounded w-full"
            />
            <Input
              type="text"
              placeholder="Enter Hour (e.g., hour1)"
              value={searchHour}
              onChange={(e) => setSearchHour(e.target.value)}
              className="p-2 border rounded w-full"
            />
            <Button
              onClick={handleSearch}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Search
            </Button>
          </div>
        </div>

        {/* Display Search Result */}
        {searchResult && (
          <div className="mb-8 bg-white p-4 rounded shadow mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                Data for {searchDay} - {searchHour}
              </h3>
              <Button
                onClick={() => setSearchResult(null)}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Close
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full border-collapse text-xs">
                <TableCaption>
                  {searchDay} - {searchHour}
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
                  {Object.entries(searchResult).map(([minute, data]) => (
                    <TableRow key={minute}>
                      <TableCell className="border p-2">{minute}</TableCell>
                      <TableCell className="border p-2">
                        {data.Button_turner_status}
                      </TableCell>
                      <TableCell className="border p-2">
                        {data.Egg_turner_status}
                      </TableCell>
                      <TableCell className="border p-2">
                        {data["Fan Status"]}
                      </TableCell>
                      <TableCell className="border p-2">
                        {data.Heater_status}
                      </TableCell>
                      <TableCell className="border p-2">
                        {data.Humidity}
                      </TableCell>
                      <TableCell className="border p-2">
                        {data.Temperature}
                      </TableCell>
                      <TableCell className="border p-2">
                        {data.Water_presense}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={8} className="p-2 space-x-1">
                      <Button
                        onClick={() => downloadPDF(searchHour)}
                        className="bg-green-600 text-white px-4 py-2 rounded"
                      >
                        Download PDF
                      </Button>
                      <Button
                        onClick={() => downloadCSV(searchHour)}
                        className="bg-blue-600 text-white px-4 py-2 rounded"
                      >
                        Download CSV
                      </Button>
                      <Button
                        onClick={() => {
                          setHourToDelete(searchHour);
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
        )}

        <SidebarProvider className="min-h-fit">
          {/* Sidebar */}
          <div className="mx-auto">
            <Sidebar className="z-1">
              <SidebarHeader className="border-b">
                <div className="p-2 flex justify-between">
                  <h2 className="text-lg font-semibold">IOT Egg Incubator</h2>
                  <SidebarTrigger />
                </div>
              </SidebarHeader>
              <SidebarContent>
                {/* Preferences */}
                <SidebarGroup>
                  <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => (window.location.href = "/")}
                          className="mr-2"
                        >
                          <SkipBack className="text-green-500" /> Back
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => setShowResetModal(true)}
                          className=""
                        >
                          <RotateCcw className="text-red-500" /> Reset All Data
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                {/* Main Navigation */}
                <SidebarGroup>
                  <SidebarGroupLabel>Select day</SidebarGroupLabel>
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
                              <CalendarDays /> {day}
                            </SidebarMenuButton>
                            <SidebarMenuButton
                              onClick={() => setShowDeleteDayModal(true)}
                              className="rounded text-red-500"
                              variant="outline"
                            >
                              <Trash2 /> Delete
                            </SidebarMenuButton>
                          </div>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter className="border-t p-4">
                <div className="text-xs text-muted-foreground">
                  IOT Egg Incubator
                </div>
              </SidebarFooter>
              <SidebarRail />
            </Sidebar>
            {/* Main content */}
            <div>
              <Button
                className={`absolute right-4 top-73 md:top-47
                  ${isTableVisible ? "block" : "hidden"}`}
                onClick={() => setIsTableVisible(false)}
              >
                Close
              </Button>
              <div className="px-4 z-10 mt-8 mx-auto w-full ">
                <SidebarTrigger className="absolute left-0 top-0" />
                <div>
                {isTableVisible && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 xl:gap-8">
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
                              {Object.entries(hourData).map(
                                ([minute, data]) => (
                                  <TableRow key={minute}>
                                    <TableCell>{minute}</TableCell>
                                    <TableCell>
                                      {data.Button_turner_status}
                                    </TableCell>
                                    <TableCell>
                                      {data.Egg_turner_status}
                                    </TableCell>
                                    <TableCell>{data["Fan Status"]}</TableCell>
                                    <TableCell>{data.Heater_status}</TableCell>
                                    <TableCell>{data.Humidity}</TableCell>
                                    <TableCell>{data.Temperature}</TableCell>
                                    <TableCell>{data.Water_presense}</TableCell>
                                  </TableRow>
                                )
                              )}
                            </TableBody>
                            <TableFooter>
                              <TableRow>
                                <TableCell
                                  colSpan={8}
                                  className="p-2 space-x-1"
                                >
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
                  )}
                </div>
              </div>
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
            <Button
              className="px-4 py-2 rounded"
              onClick={() => setShowDeleteDayModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="px-4 py-2 bg-red-500 text-white rounded"
              onClick={handleDeleteDay}
            >
              Delete
            </Button>
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
            <Button
              className="px-4 py-2 rounded"
              onClick={() => setShowDeleteHourModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="px-4 py-2 bg-red-500 text-white rounded"
              onClick={handleDeleteHour}
            >
              Delete
            </Button>
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
          <h4 className="text-xl font-bold mb-4 text-red-500">
            Confirm System Reset
          </h4>
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
            <Label htmlFor="note">
              <Checkbox
                id="note"
                checked={resetConfirmed}
                onCheckedChange={(checked) => setResetConfirmed(checked)}
              />
              I understand this action will erase all data
            </Label>
            {/* <label className="flex items-center">
              <input
                type="checkbox"
                checked={resetConfirmed}
                onChange={(e) => setResetConfirmed(e.target.checked)}
                className="mr-2"
              />
              I understand this action will erase all data
            </label> */}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              className="px-4 py-2"
              onClick={() => {
                setShowResetModal(false);
                setResetConfirmed(false);
              }}
            >
              Cancel
            </Button>
            <Button
              className={`px-4 py-2 text-white rounded ${
                resetConfirmed ? "bg-red-500" : "bg-gray-400"
              }`}
              onClick={handleResetSystem}
              disabled={!resetConfirmed}
            >
              Reset System
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Datalogs;
