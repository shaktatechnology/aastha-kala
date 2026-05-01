"use client";

import { useState } from "react";
import InstructorsCard from "../layout/InstructorsCard";
import InstructorDetailModal from "../layout/InstructorDetailModal";
import { Users } from "lucide-react";

interface Instructor {
  id: number;
  name: string;
  title?: string;
  about?: string;
  facebook_url?: string;
  instagram_url?: string;
  email?: string;
  phone?: string;
  image?: string;
}

interface Props {
  instructors: Instructor[];
}

const ClientInstructors = ({ instructors }: Props) => {
  if (!instructors || instructors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <Users className="w-12 h-12 animate-bounce text-secondary" />
        <p className="text-lg font-medium mt-3">No instructors found</p>
        <p className="text-sm mt-2">Please check back later for updates</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 items-stretch">
        {instructors.map((instructor) => (
          <InstructorsCard 
            key={instructor.id} 
            instructor={instructor} 
          />
        ))}
      </div>
    </div>
  );
};

export default ClientInstructors;
