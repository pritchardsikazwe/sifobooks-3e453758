using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Text;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace SifoBooksDesktop;

internal static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        var appDir = AppContext.BaseDirectory;
        var exeName = Path.GetFileNameWithoutExtension(Environment.ProcessPath ?? "SifoBooks");
        var serverPath = Path.Combine(appDir, exeName + "-server.exe");

        if (!File.Exists(serverPath))
        {
            MessageBox.Show($"SifoBooks server was not found:\n{serverPath}", "SifoBooks", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        Process? server = null;
        try
        {
            server = Process.Start(new ProcessStartInfo
            {
                FileName = serverPath,
                WorkingDirectory = appDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            });

            var url = WaitForServer(appDir, 30000);
            if (url is null)
            {
                MessageBox.Show("SifoBooks could not start its local service. Check data\\desktop-startup.log for details.",
                    "SifoBooks", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            using var form = new MainForm(url);
            Application.Run(form);
        }
        finally
        {
            try
            {
                if (server is { HasExited: false }) server.Kill(entireProcessTree: true);
            }
            catch { }
        }
    }

    static string? WaitForServer(string appDir, int timeoutMs)
    {
        var portFile = Path.Combine(appDir, "data", "desktop-port.txt");
        var sw = Stopwatch.StartNew();
        using var client = new HttpClient { Timeout = TimeSpan.FromMilliseconds(700) };

        while (sw.ElapsedMilliseconds < timeoutMs)
        {
            try
            {
                if (File.Exists(portFile))
                {
                    var raw = File.ReadAllText(portFile).Trim();
                    if (int.TryParse(raw, out var port))
                    {
                        var url = $"http://127.0.0.1:{port}";
                        using var response = client.GetAsync(url).GetAwaiter().GetResult();
                        if ((int)response.StatusCode < 500) return url;
                    }
                }
            }
            catch { }
            Thread.Sleep(250);
        }

        return null;
    }
}

sealed class MainForm : Form
{
    readonly string startUrl;
    readonly WebView2 webView = new();
    CoreWebView2Environment? environment;

    public MainForm(string url)
    {
        startUrl = url;
        Text = "SifoBooks";
        Width = 1440;
        Height = 900;
        MinimumSize = new Size(1100, 700);
        StartPosition = FormStartPosition.CenterScreen;
        Icon = TryLoadIcon();

        webView.Dock = DockStyle.Fill;
        Controls.Add(webView);
        Load += async (_, _) => await InitializeAsync();
        FormClosing += (_, _) => webView.Dispose();
    }

    async Task InitializeAsync()
    {
        try
        {
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "SifoBooks", "WebView2");
            Directory.CreateDirectory(userData);

            environment = await CoreWebView2Environment.CreateAsync(null, userData);
            await webView.EnsureCoreWebView2Async(environment);

            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.IsZoomControlEnabled = true;
            webView.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = true;
            webView.CoreWebView2.Navigate(startUrl);
        }
        catch (Exception ex)
        {
            var log = Path.Combine(AppContext.BaseDirectory, "data", "desktop-startup.log");
            Directory.CreateDirectory(Path.GetDirectoryName(log)!);
            File.AppendAllText(log, $"[{DateTime.Now:O}] WEBVIEW2 ERROR: {ex}\r\n");
            MessageBox.Show(
                "Microsoft Edge WebView2 Runtime is required for the SifoBooks desktop window.\n\n" +
                "The installer should install WebView2 automatically. If it is unavailable, open the SifoBooks URL in Microsoft Edge or another supported browser.\n\n" +
                ex.Message,
                "SifoBooks — WebView2 unavailable",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
            Close();
        }
    }

    Icon? TryLoadIcon()
    {
        var ico = Path.Combine(AppContext.BaseDirectory, "SifoBooks.ico");
        return File.Exists(ico) ? new Icon(ico) : null;
    }
}
