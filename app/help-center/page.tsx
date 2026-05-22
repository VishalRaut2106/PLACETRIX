"use client";
import { motion } from 'framer-motion';
import { Search, Book, Rocket, ShieldCheck, Mail, MessageSquare, ArrowRight } from 'lucide-react';

const HelpCenter = () => {
  const categories = [
    {
      icon: <Rocket className="w-8 h-8 text-[#4bc6b9]" />,
      title: "Getting Started",
      description: "Learn how to set up PlaceTrix for your institution and onboard students."
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-[#4bc6b9]" />,
      title: "Account & Security",
      description: "Manage admin permissions, password resets, and data privacy settings."
    },
    {
      icon: <Book className="w-8 h-8 text-[#4bc6b9]" />,
      title: "Feature Guides",
      description: "Deep dives into QR attendance, mock tests, and AI analytics tools."
    }
  ];

  const faqs = [
    {
      question: "How do I integrate PlaceTrix with our existing database?",
      answer: "PlaceTrix supports bulk CSV uploads and API integrations. Contact our technical team for a guided setup."
    },
    {
      question: "Can students update their resumes after submission?",
      answer: "Yes, students can replace their resumes anytime through their mobile app profile section."
    },
    {
      question: "Is the AI Analytics Assistant available for all plans?",
      answer: "The AI Analytics Assistant is currently in beta for Premium Tier institutional partners."
    }
  ];

  return (
    <section id="help-center" className="py-24 bg-black text-white min-h-screen">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header & Search */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6">How can we help?</h1>
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search for articles, guides, or troubleshooting..." 
              className="w-full bg-gray-900 border border-gray-800 rounded-full py-4 pl-12 pr-6 focus:outline-none focus:border-[#4bc6b9] transition-colors text-gray-200"
            />
          </div>
        </motion.div>

        {/* Category Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {categories.map((cat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-8 bg-gray-900 border border-gray-800 rounded-2xl hover:border-[#4bc6b9]/50 transition-all cursor-pointer group"
            >
              <div className="mb-4">{cat.icon}</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-[#4bc6b9] transition-colors">{cat.title}</h3>
              <p className="text-gray-400 mb-4">{cat.description}</p>
              <div className="flex items-center text-sm font-medium text-[#4bc6b9]">
                View Articles <ArrowRight className="ml-2 w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6 bg-gray-900/50 border-l-4 border-[#4bc6b9] rounded-r-xl">
                <h4 className="text-lg font-medium text-white mb-2">{faq.question}</h4>
                <p className="text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="bg-[#4bc6b9]/10 border border-[#4bc6b9]/20 rounded-3xl p-10 text-center"
        >
          <h2 className="text-2xl font-bold mb-4">Still need assistance?</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Our support team is available Monday through Friday to help you with any technical or administrative challenges.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-6">
            <a 
              href="mailto:business@360viewtech.in" 
              className="flex items-center justify-center gap-2 bg-[#4bc6b9] text-black px-8 py-3 rounded-full font-bold hover:bg-[#3da89d] transition-all"
            >
              <Mail className="w-5 h-5" /> Email Support
            </a>
            <button className="flex items-center justify-center gap-2 bg-transparent border border-gray-700 text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-all">
              <MessageSquare className="w-5 h-5" /> Live Chat
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HelpCenter;