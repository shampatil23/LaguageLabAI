import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Save, Building2, HardDrive, Globe, Database, RotateCcw } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">System Settings</h1>
        <p className="text-slate-500 mt-1">Configure institution details, synchronization, and software preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-2">
           <button className="w-full text-left px-4 py-2 bg-primary-50 text-primary-700 font-medium rounded-md">Institution Profile</button>
           <button className="w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50 font-medium rounded-md">Online & Offline Sync</button>
           <button className="w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50 font-medium rounded-md">User Roles & Access</button>
           <button className="w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50 font-medium rounded-md">Storage & Backup</button>
           <button className="w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50 font-medium rounded-md">License Information</button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5"/> Institution Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Institution Name</label>
                  <Input defaultValue="Language Lab AI" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Institution Code</label>
                  <Input defaultValue="LLA-8472" disabled />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Administrator Email</label>
                <Input defaultValue="admin@languagelab.com" />
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button><Save className="w-4 h-4 mr-2"/> Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5"/> Online & Offline Synchronization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-success-100 text-success-600 flex items-center justify-center"><Database className="w-5 h-5"/></div>
                   <div>
                     <p className="font-medium text-slate-900">Cloud Sync Status</p>
                     <p className="text-sm text-slate-500">Last synchronized: Today, 10:45 AM</p>
                   </div>
                </div>
                <Button variant="outline" size="sm"><RotateCcw className="w-4 h-4 mr-2"/> Force Sync</Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">Enable Offline Mode</p>
                    <p className="text-xs text-slate-500">Allow students to complete practicals without internet connection.</p>
                  </div>
                  <div className="w-11 h-6 bg-primary-600 rounded-full relative cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">Auto-download Course Content</p>
                    <p className="text-xs text-slate-500">Download media files to local storage for faster access.</p>
                  </div>
                  <div className="w-11 h-6 bg-primary-600 rounded-full relative cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><HardDrive className="w-5 h-5"/> Local Storage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex justify-between text-sm font-medium text-slate-700">
                <span>Usage: 45GB / 500GB</span>
                <span>9%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
                <div className="h-full bg-primary-500 w-[9%] rounded-full"></div>
              </div>
              <Button variant="outline" className="text-danger-600 border-danger-200 hover:bg-danger-50">Clear Local Cache</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
