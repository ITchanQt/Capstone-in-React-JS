import { MenuIcon } from "lucide-react";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "./ui/button";

function Navbar() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-primary-green text-white">
      <div className="w-full mx-auto px-4 py-3 flex justify-between items-center bg-green-500">
        <h1 className="text-2xl font-bold">Incubator Dashboard</h1>
        <div className="hidden md:flex items-center space-x-4">
          <Link
            to="/home"
            className={`px-3 py-2 rounded ${
              isActive("/home")
                ? "bg-light-green text-primary-green"
                : "hover:bg-green-700"
            }`}
          >
            Home
          </Link>
          <Link
            to="/controls"
            className={`px-3 py-2 rounded ${
              isActive("/controls")
                ? "bg-light-green text-primary-green"
                : "hover:bg-green-700"
            }`}
          >
            Controls
          </Link>
          <Link
            to="/datalogs"
            className="bg-secondary-green px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            Datalogs
          </Link>
        </div>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger>
              <MenuIcon />
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Incubator Dashboard</SheetTitle>
                <SheetDescription>
                  <div className="flex flex-col space-y-2 items-center mt-10">
                    <Button>
                      <Link
                        to="/home"
                        className={`px-3 py-2 rounded ${
                          isActive("/home")
                            ? "bg-light-green text-primary-green"
                            : "hover:bg-green-700"
                        }`}
                      >
                        Home
                      </Link>
                    </Button>
                    <Button>
                      <Link
                        to="/controls"
                        className={`px-3 py-2 rounded ${
                          isActive("/controls")
                            ? "bg-light-green text-primary-green"
                            : "hover:bg-green-700"
                        }`}
                      >
                        Controls
                      </Link>
                    </Button>
                    <Button>
                      <Link
                        to="/datalogs"
                        className="bg-secondary-green px-4 py-2 rounded hover:bg-green-700 transition-colors"
                      >
                        Datalogs
                      </Link>
                    </Button>
                  </div>
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
