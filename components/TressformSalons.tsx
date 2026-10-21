// Salons — a short notice that matching salons are on the way.
//
// 10.10.2026 design pass: this was a full-height section with a large
// picture, three chips and a disabled button, for something a visitor can't
// use yet. It is now one compact strip: the salon photo, what is coming, and
// the plain words "Coming soon". It keeps its place in the header menu
// (id="salons") because salon bookings are the second half of the business.

import Image from "next/image";
import FindSalonButton from "./salons/FindSalonButton";

export default function TressformSalons() {
  return (
    <section id="salons" className="bg-bg text-ink-body">
      <div className="frame pb-16 sm:pb-20 lg:pb-28">
        <div className="grid items-center gap-x-16 gap-y-8 overflow-hidden rounded-[28px] bg-mint-pale lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-x-24">
          <div className="p-7 sm:p-10 lg:py-14 lg:pl-14 lg:pr-0">
            <p className="text-[15px] font-semibold text-mint-deep">Partner salons</p>
            <h2 className="mt-2 font-heading text-[clamp(26px,2.6vw,40px)] font-semibold leading-[1.08]">
              Get your Tressform look at a matching salon.
            </h2>
            <p className="mt-4 max-w-[46ch] text-[16.5px] leading-[1.6]">
              Style Match reads the technique your chosen haircut actually needs, not just its name, and points you to
              a partner salon whose stylists can do it.
            </p>
            {/* 21.10.2026: appears once a salon has been approved. */}
            <FindSalonButton className="mt-5" />
            {/* 21.10.2026: salons can list themselves now (app/salons/join). */}
            <div className="mt-6 rounded-[18px] bg-surface/80 p-4">
              <p className="text-[15px] font-semibold text-ink-heading">Own a salon?</p>
              <p className="mt-1 text-[14px] leading-[1.5] text-ink-body">
                List it on Tressform. Free during our launch period, in under 5 minutes.
              </p>
              <a href="/salons/join" className="btn-amber mt-3 !px-6 !py-2.5 !text-[15px] !shadow-none">
                List your salon free
              </a>
            </div>
          </div>
          <div className="aspect-[16/9] h-full w-full lg:aspect-auto lg:min-h-[340px]">
            <Image
              src="/images/salon-interior.jpg"
              alt="A calm salon interior with a barber chair in front of an arched mirror."
              width={1200}
              height={675}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
