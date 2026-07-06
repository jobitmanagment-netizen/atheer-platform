import React from "react";
import { Link } from "react-router-dom";

export default function AuthLayout({ 
  children, 
  icon: Icon, 
  title, 
  subtitle, 
  footer 
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
          </Link>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          {children}
        </div>
        <div className="text-center text-sm text-muted-foreground mt-6">
          {footer}
        </div>
      </div>
    </div>
  );
}
