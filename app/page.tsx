'use client';

import useRequireAuth from './hooks/useRequireAuth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Users,
  MapPin,
  CheckSquare,
  FileText,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  useRequireAuth();
  const features = [
    {
      href: "/housekeepers",
      icon: Users,
      title: "Manage Housekeepers",
      description: "View, add, and manage housekeeper profiles and employment details",
      color: "bg-blue-100 dark:bg-blue-900",
      textColor: "text-blue-600 dark:text-blue-300",
    },
    {
      href: "/roster",
      icon: Calendar,
      title: "Weekly Roster",
      description: "Create and manage weekly cleaning schedules with drag-and-drop",
      color: "bg-purple-100 dark:bg-purple-900",
      textColor: "text-purple-600 dark:text-purple-300",
    },
    {
      href: "/locations",
      icon: MapPin,
      title: "Manage Locations",
      description: "Organize care units, building blocks, and floors",
      color: "bg-cyan-100 dark:bg-cyan-900",
      textColor: "text-cyan-600 dark:text-cyan-300",
    },
    {
      href: "/my-schedule",
      icon: CheckSquare,
      title: "My Schedule",
      description: "View your assigned cleaning tasks for the week",
      color: "bg-green-100 dark:bg-green-900",
      textColor: "text-green-600 dark:text-green-300",
    },
    {
      href: "/export",
      icon: FileText,
      title: "Export Rosters",
      description: "Export rosters as PDF or Excel for printing and distribution",
      color: "bg-orange-100 dark:bg-orange-900",
      textColor: "text-orange-600 dark:text-orange-300",
    },
     {
      href: "/task",
      icon: FileText,
      title: "Manage Tasks",
      description: "Create and manage cleaning tasks for your housekeepers",
      color: "bg-orange-100 dark:bg-orange-900",
      textColor: "text-orange-600 dark:text-orange-300",
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 text-white p-12">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold mb-4">
            Housekeeper Roster Management System
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Digitize your weekly cleaning schedules for retirement villages and elder care facilities in New Zealand.
            Create rosters, assign tasks, and track schedules all in one place.
          </p>
          <div className="flex gap-4">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Link href="/roster">
                Create Roster <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-blue-700"
            >
              <Link href="/housekeepers">
                View Housekeepers
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section>
        <h2 className="text-3xl font-bold mb-8 text-center">Core Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.href} href={feature.href}>
                <Card className="h-full hover:shadow-lg transition cursor-pointer">
                  <CardHeader>
                    <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                      <Icon className={`h-6 w-6 ${feature.textColor}`} />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Info Section */}
      <section className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="text-3xl font-bold text-blue-600 mb-2">1</div>
            <h3 className="font-semibold mb-2">Set Up Staff</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Add housekeepers with their details, employment type, and availability
            </p>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600 mb-2">2</div>
            <h3 className="font-semibold mb-2">Plan Roster</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Create weekly rosters by dragging tasks into time slots and assigning housekeepers
            </p>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600 mb-2">3</div>
            <h3 className="font-semibold mb-2">Export & Share</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Export completed rosters as PDF or Excel to distribute to staff
            </p>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Managing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Multiple Facilities</div>
            <p className="text-xs text-gray-500 mt-1">Retire homes across NZ</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8+ Areas</div>
            <p className="text-xs text-gray-500 mt-1">Rooms, gyms, toilets, etc.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Frequencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4 Types</div>
            <p className="text-xs text-gray-500 mt-1">Daily to monthly schedules</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Export Formats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PDF + Excel</div>
            <p className="text-xs text-gray-500 mt-1">Easy sharing & printing</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
