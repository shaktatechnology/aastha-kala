"use client";

import { useEffect, useState } from "react";
import { X, Calendar, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface Event {
    id: number;
    title: string;
    slug: string;
    description: string;
    banner: string;
    event_date: string;
    location: string;
    is_active: boolean;
}

const EventOverlay = () => {
    const [activeEvents, setActiveEvents] = useState<Event[]>([]);
    const [currentEventIndex, setCurrentEventIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user has already seen and dismissed the overlay in this session
        const hasSeenOverlay = sessionStorage.getItem("hasSeenEventOverlay");
        if (hasSeenOverlay) {
            setLoading(false);
            return;
        }

        const fetchActiveEvents = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events`);
                const data = await res.json();

                const events: Event[] = data?.data?.data || [];
                const active = events.filter(e => e.is_active);

                if (active.length > 0) {
                    setActiveEvents(active);
                    setTimeout(() => {
                        setIsVisible(true);
                        setIsAnimating(true);
                    }, 500);
                }
            } catch (error) {
                console.error("Failed to fetch events for overlay:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchActiveEvents();
    }, []);

    const dismissOverlay = () => {
        setIsAnimating(false);
        // Track that user has seen/dismissed it
        sessionStorage.setItem("hasSeenEventOverlay", "true");
        setTimeout(() => {
            setIsVisible(false);
        }, 300);
    };

    if (!isVisible || activeEvents.length === 0) return null;

    const currentEvent = activeEvents[currentEventIndex];

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 bg-black/70 backdrop-blur-md transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
            style={{ pointerEvents: isAnimating ? 'auto' : 'none' }}
        >
            <div
                className={`relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] transform transition-all duration-500 flex flex-col md:flex-row ${isAnimating ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}
            >
                <button
                    onClick={dismissOverlay}
                    className="absolute top-4 right-4 z-20 p-2 bg-white/30 backdrop-blur-md rounded-full"
                    style={{ filter: "invert(1)" }}
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Left Side: Banner */}
                <div className="relative w-full md:w-1/2 aspect-square md:aspect-auto">
                    {currentEvent.banner ? (
                        <img
                            src={currentEvent.banner}
                            alt={currentEvent.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
                            <Calendar className="w-20 h-20 text-white/20" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden" />
                    <div className="absolute bottom-4 left-6 md:hidden">
                        <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                            Upcoming Event
                        </span>
                    </div>
                </div>

                {/* Right Side: Content */}
                <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col max-h-[60vh] md:max-h-none overflow-y-auto">
                    <div className="hidden md:block mb-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full uppercase tracking-wider">
                            Upcoming Event
                        </span>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-4">
                        {currentEvent.title}
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center text-gray-600 text-sm">
                            <div className="p-2 bg-blue-50 rounded-lg mr-3">
                                <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 uppercase text-[10px] tracking-tighter">Date & Time</p>
                                <span>{formatDate(currentEvent.event_date)}</span>
                            </div>
                        </div>
                        <div className="flex items-center text-gray-600 text-sm">
                            <div className="p-2 bg-orange-50 rounded-lg mr-3">
                                <MapPin className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 uppercase text-[10px] tracking-tighter">Location</p>
                                <span className="line-clamp-1">{currentEvent.location}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <p className="font-bold text-gray-900 uppercase text-[10px] tracking-tighter mb-2">About Event</p>
                        <div
                            className="text-gray-600 text-sm leading-relaxed line-clamp-4 md:line-clamp-6"
                            dangerouslySetInnerHTML={{ __html: currentEvent.description }}
                        />
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                        <Link
                            href={`/events/${currentEvent.slug}`}
                            onClick={dismissOverlay}
                            className="flex-1 px-8 py-4 bg-blue-600 hover:bg-black text-white font-bold rounded-2xl text-center transition-all duration-300 flex items-center justify-center group"
                        >
                            Learn More
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        {activeEvents.length > 1 && (
                            <button
                                onClick={() => {
                                    setIsAnimating(false);
                                    setTimeout(() => {
                                        setCurrentEventIndex((prev) => (prev + 1) % activeEvents.length);
                                        setIsAnimating(true);
                                    }, 200);
                                }}
                                className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-2xl transition-all duration-300"
                            >
                                Next
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventOverlay;
