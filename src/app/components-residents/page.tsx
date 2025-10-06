"use client";


import Header from "../components-residents/Header";
import ScheduleCarousel from "../components-residents/ScheduleCarousel";
import OngoingSchedule from "../components-residents/OngoingSchedule";
import QuickActions from "../components-residents/QuickActions";
import EducationalContent from "../components-residents/EducationalContent";

export default function ResidentsPage() {
  return (
    <>
      <Header name="Kent" email="kent@email.com" />
      <ScheduleCarousel />
      <div className="px-4 space-y-6">
        <OngoingSchedule />
        <QuickActions />
        <EducationalContent />
      </div>
    </>
  );
}
